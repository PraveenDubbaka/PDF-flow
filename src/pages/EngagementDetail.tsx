import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, ChevronDown, Landmark, FileText, Triangle, FileSpreadsheet, PencilLine, Pencil, Settings2, Download, FileType, Share2, Save, RefreshCw, Trash2, Building2, Calendar, Check, AlertTriangle, Loader2, History, Upload, FileUp, Bell, Plus, X, LayoutGrid, CheckCircle2, PlugZap, Zap, ClipboardList, UserPlus, UploadCloud, FileCheck2, ExternalLink, Maximize2, Minimize2, Minus, SendHorizontal, MessageSquare, Pause, Play } from "lucide-react";
import { getEnabled, subscribeEnabled, registerEngagement, unregisterEngagement, updateEngagementTime } from "@/lib/timeTrackerStore";
import { ExpandableIconButton } from "@/components/ui/expandable-icon-button";
import { ChecklistIcon } from "@/components/icons/ChecklistIcon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { LukaIcon } from "@/components/LukaIcon";
import { DocumentView } from "@/components/DocumentView";
import { LetterView } from "@/components/LetterView";
import { AuditMaterialityWorksheet } from "@/components/AuditMaterialityWorksheet";
import { AuditScopeWorksheet } from "@/components/AuditScopeWorksheet";
import { AuditPAPWorksheet } from "@/components/AuditPAPWorksheet";
import { AuditTimeTrackerWorksheet } from "@/components/AuditTimeTrackerWorksheet";
import { AuditMgmtRequestsWorksheet } from "@/components/AuditMgmtRequestsWorksheet";
import { BulkRequestsWorksheet } from "@/components/BulkRequestsWorksheet";
import { AuditTeamPlanningWorksheet } from "@/components/AuditTeamPlanningWorksheet";
import { AuditSAEWorksheet } from "@/components/AuditSAEWorksheet";
import { AuditOASWorksheet } from "@/components/AuditOASWorksheet";
import { Audit311Worksheet } from "@/components/Audit311Worksheet";
import { Audit320Worksheet } from "@/components/Audit320Worksheet";
import { Audit325Worksheet } from "@/components/Audit325Worksheet";
import { Audit330Worksheet } from "@/components/Audit330Worksheet";
import { Audit335Worksheet } from "@/components/Audit335Worksheet";
import { Audit340Worksheet } from "@/components/Audit340Worksheet";
import { Audit370Worksheet } from "@/components/Audit370Worksheet";
import { Audit375Worksheet } from "@/components/Audit375Worksheet";
import { AuditAIMWorksheet } from "@/components/AuditAIMWorksheet";
import { AuditSOSignoffsWorksheet } from "@/components/AuditSOSignoffsWorksheet";
import { AuditFinalReviewWorksheet } from "@/components/AuditFinalReviewWorksheet";

import { AuditPAP501Worksheet } from "@/components/AuditPAP501Worksheet";

import { Audit507Worksheet } from "@/components/Audit507Worksheet";
import { Audit510Worksheet } from "@/components/Audit510Worksheet";
import { Audit511Worksheet } from "@/components/Audit511Worksheet";
import { Audit513Worksheet } from "@/components/Audit513Worksheet";
import { Audit515Worksheet } from "@/components/Audit515Worksheet";
import { Audit514Worksheet } from "@/components/Audit514Worksheet";
import { Audit520Worksheet } from "@/components/Audit520Worksheet";
import { Audit540Worksheet } from "@/components/Audit540Worksheet";
import { Audit550Worksheet } from "@/components/Audit550Worksheet";
import { Audit551Worksheet } from "@/components/Audit551Worksheet";
import { Audit535Worksheet } from "@/components/Audit535Worksheet";
import { Audit575Worksheet } from "@/components/Audit575Worksheet";
import { Audit580Worksheet } from "@/components/Audit580Worksheet";
import { Audit590Worksheet } from "@/components/Audit590Worksheet";
import { Audit610Worksheet } from "@/components/Audit610Worksheet";
import { Audit605Worksheet } from "@/components/Audit605Worksheet";
import { Audit625Worksheet } from "@/components/Audit625Worksheet";
import { Audit630Worksheet } from "@/components/Audit630Worksheet";
import { Audit635Worksheet } from "@/components/Audit635Worksheet";
import { Audit645Worksheet } from "@/components/Audit645Worksheet";
import { Audit650Worksheet } from "@/components/Audit650Worksheet";
import { Audit655Worksheet } from "@/components/Audit655Worksheet";
import { Audit666Worksheet } from "@/components/Audit666Worksheet";
import { Audit670Worksheet } from "@/components/Audit670Worksheet";
import { Audit680Worksheet } from "@/components/Audit680Worksheet";
import { ConnectorsModal, CONNECTORS_BY_ID } from "@/components/ConnectorsModal";
import { getEngagementMeta } from "@/store/engagementsStore";
import FSPageViewer, { FSPageType } from "@/components/FSPageViewer";
import FSSettingsPanel from "@/components/luka/workspace/FSSettingsPanel";
import LayoutSettingsPanel from "@/components/luka/workspace/LayoutSettingsPanel";
import { LayoutSettingsProvider } from "@/components/luka/workspace/LayoutSettingsContext";
import CommentsPanel from "@/components/luka/comments/CommentsPanel";
import { CommentProvider, useComments } from "@/components/luka/comments/CommentContext";
import CommentPinsOverlay from "@/components/luka/comments/CommentPinsOverlay";
import CommentMinimap from "@/components/luka/comments/CommentMinimap";
import { WorksheetSignOff } from "@/components/WorksheetSignOff";
import VersionHistoryPanel from "@/components/luka/workspace/versionControl/VersionHistoryPanel";
import { AskLukaOverlay, AllTemplateSummary, AutoFillProgressItem } from "@/components/AskLukaOverlay";
import { FloatingActionBar } from "@/components/FloatingActionBar";
import { useTimeEntries } from "@/lib/useTimeEntries";
import { EngagementRightPanel } from "@/components/EngagementRightPanel";
import { Assignee, Checklist, Question } from "@/types/checklist";
import { useChecklistAssignments } from "@/hooks/useChecklistAssignments";
import { AssignmentDialog } from "@/components/AssignmentDialog";
import { readJsonFromLocalStorage, writeJsonToLocalStorage } from "@/lib/safeJson";
import { exportWorksheetAsPDF, exportWorksheetAsWord } from "@/lib/worksheetExport";
import { openLukaWithConfig, setLukaOpen as setStoreLukaOpen } from "@/lib/lukaOpenStore";
import { clearPBCNotifications, getPBCNotificationCount } from "@/lib/pbcRequestStore";
import { subscribeToChecklistSync, dispatchChecklistSync } from "@/lib/checklistSync";
import { toast } from "sonner";
import { ShareWithClientDialog } from "@/components/ShareWithClientDialog";
import { LetterSectionPage, type LetterSectionPageHandle } from "@/components/LetterSectionPage";
import { CustomSection } from "@/components/Sidebar";
import { NotesWorksheet } from "@/components/NotesWorksheet";
import { NotesSlidePanel } from "@/components/NotesSlidePanel";
import { ClientResponseDialog } from "@/components/ClientResponseDialog";
import { useClientResponses } from "@/hooks/useClientResponses";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { DeleteChecklistDialog } from "@/components/DeleteChecklistDialog";
import { AddChecklistSheet } from "@/components/AddChecklistSheet";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AuditASMImportBanner } from "@/components/AuditASMImportBanner";
import { Audit506ImportBanner } from "@/components/Audit506ImportBanner";
import { Audit525ImportBanner } from "@/components/Audit525ImportBanner";
import { useSecondaryPanel } from "@/hooks/useSecondaryPanel";
import {
 generateClientAcceptanceContinuanceChecklist,
 generateIndependenceChecklist,
 generateKnowledgeOfClientBusinessChecklist,
 generateUnderstandingEntityIndustryEnvironmentChecklist,
 generatePlanningChecklist,
 generateEngagementLetterChecklist,
 generateManagementResponsibilityChecklist,
 generateNewEngagementAcceptanceChecklist,
 generateExistingEngagementContinuanceChecklist,
 generateForm408InitialAuditEngagements,
 generateForm410AcceptanceContinuance,
 generateUnderstandingEntityBasicsChecklist,
 generateUnderstandingEntitySystemsChecklist,
 generateEngagementPlanningChecklist,
 generateSubsequentEventsChecklist,
 generateWorksheetGoingConcernChecklist,
 generateReviewCompletionChecklist,
 generateSpecificCircumstancesChecklist,
 generateWorksheetAccountingEstimatesChecklist,
 generateUnderstandingInternalControlsChecklist,
 generateSCOTRevenueCycleChecklist,
 generateSCOTExpenditureCycleChecklist,
 generateSCOTPayrollCycleChecklist,
 generateAccumulationOfMisstatementsChecklist,
 generateFinalAnalyticalReviewChecklist,
 generateAuditCompletionChecklist,
 generateEngagementPartnerAuditCompletionChecklist,
 generateAuditorsReportChecklist,
 generateModifiedOpinionChecklist,
 generateForm310AuditCompletionChecklist,
 generateForm312EngagementPartnerChecklist,
 generateSupplementaryInfoChecklist,
 generateManagementRepresentationsChecklist,
 generateAuditIndependenceChecklist,
 generateAMLComplianceChecklist,
 generateAuditMaterialityChecklist,
 generateAuditEngagementLetterChecklist,
 generateLetterToPredecessorAccountingFirmChecklist,
 generateTCWGPlanningCommunicationChecklist,
 generateTCWGFinalCommunicationChecklist,
 generateEngagementScopeChecklist,
 generatePreliminaryAnalyticalProceduresChecklist,
 generateAuditStrategyMemorandumChecklist,
 generateStaffingTimeBudgetChecklist,
 generateRiskAssessmentProceduresChecklist,
 generateITGeneralControlsChecklist,
 generateFraudRiskAssessmentChecklist,
 generateSignificantRisksRegisterChecklist,
 generateRMMChecklist,
 generateOverallAuditResponseChecklist,
 generateTestOfControlsChecklist,
 generateSubstantiveAnalyticalProceduresChecklist,
 generateTestOfDetailsRevenueChecklist,
 generateTestOfDetailsExpensesChecklist,
 generateAuditProceduresSummaryChecklist,
 generateGoingConcernInitialAssessmentChecklist,
 generateGoingConcernFinalAssessmentChecklist,
 generateAuditEngagementLetterGAASUSGAAP,
 generateManagementRepLetterAUC580,
 generateCommunicationTCWGPlanningUS,
 generateCommunicationTCWGFinalUS,
 generateUSAuditFairPresentation,
 generateUSNewEngagementAcceptanceChecklist,
 generateUSExistingEngagementContinuanceChecklist,
 generateUSAuditIndependenceChecklist,
 generateUSAMLComplianceChecklist,
 generateUSForm408InitialAuditEngagements,
 generateUSForm410AcceptanceContinuance,
 generateUSUnderstandingEntityBasicsChecklist,
 generateUSUnderstandingEntitySystemsChecklist,
 generateUSUnderstandingEntityIndustryChecklist,
 generateUSEngagementPlanningChecklist,
 generateUSAuditMaterialityChecklist,
 generateUSEngagementScopeChecklist,
 generateUSPreliminaryAnalyticalProceduresChecklist,
 generateUSAuditStrategyMemorandumChecklist,
 generateUSStaffingTimeBudgetChecklist,
 generateUSRiskAssessmentProceduresChecklist,
 generateUSUnderstandingInternalControlsChecklist,
 generateUSITGeneralControlsChecklist,
 generateUSFraudRiskAssessmentChecklist,
 generateUSSignificantRisksRegisterChecklist,
 generateUSRMMChecklist,
 generateUSSCOTRevenueCycleChecklist,
 generateUSSCOTExpenditureCycleChecklist,
 generateUSSCOTPayrollCycleChecklist,
 generateUSGoingConcernInitialAssessmentChecklist,
 generateUSOverallAuditResponseChecklist,
 generateUSTestOfControlsChecklist,
 generateUSSubstantiveAnalyticalProceduresChecklist,
 generateUSTestOfDetailsRevenueChecklist,
 generateUSTestOfDetailsExpensesChecklist,
 generateUSIndependentAuditorsReportChecklist,
 generateUSAccumulationOfMisstatementsChecklist,
 generateUSFinalAnalyticalReviewChecklist,
 generateUSSubsequentEventsChecklist,
 generateUSGoingConcernFinalAssessmentChecklist,
 generateUSAuditCompletionChecklist,
 generateUSQualityControlReviewChecklist,
 generateInquiryToLegalCounselUS,
 generateCommunicationToPredecessorAuditorUS,
 generateLetterToManagementSignificantDeficienciesUS,
 generateAuditWorksheetSignificantDecisionsUS,
 generateAuditWorksheetKeyAuditMattersUS,
 generateAuditWorksheetFindingsUS,
 generateAuditWorksheetMattersCommunicatedUS,
 generateAuditWorksheetFutureConsiderationUS,
 generateAuditWorksheetDocumentingConsultationUS,
 generateAuditWorksheetWithdrawalUS,
 generateAuditWorksheetWithdrawalCA,
 generateAuditWorksheetSignificantDecisionsCA,
 generateAuditWorksheetKeyAuditMattersCA,
 generateAuditWorksheetFindingsCA,
 generateAuditWorksheetSummaryMisstatementsCA,
 generateAuditWorksheetMattersCommunicatedCA,
 generateAuditWorksheetFutureConsiderationCA,
 generateAuditWorksheetDocumentingConsultationCA,
 generateUSJournalEntryTestingLog,
 generateUSRelatedPartyTransactionsWorksheet,
 generateUSGoodwillImpairmentAssessment,
 generateSelectingAuditorExpertChecklist,
 generateUSSelectingAuditorExpertChecklist,
 generate510IdentifyingRisksChecklist,
 generate511ITEnvironmentChecklist,
 generate513AccountingEstimatesChecklist,
 generate515RelatedPartiesChecklist,
 generate525GoingConcernChecklist,
 generate530PervasiveRisksChecklist,
 generate535InfoSystemChecklist,
 generate550ControlActivitiesChecklist,
 generate551ITGCChecklist,
 generate580SignificantDeficienciesChecklist,
 generate605RespondingToRiskChecklist,
 generate645LitigationClaimsChecklist,
 generate650SubsequentEventsChecklist2,
 generate670JournalEntryTestingChecklist,
 generate500OIChecklist,
 generate501APAPChecklist,
 generate505MgmtInquiriesChecklist,
 generate506FraudIdentificationChecklist,
 generateAuditCACompletionChecklist,
 generateAuditCADisclosureChecklist,
} from "@/lib/globalTemplates";

// Sample engagement data matching the engagements page
const engagementsData: Record<string, {
 id: string;
 client: string;
 type: string;
 yearEnd: string;
 status: string;
 checklistId?: string;
 region?: "ca" | "us";
 jurisdiction?: string;
}> = {
 "AUD-NPM-Dec312025": {
 id: "AUD-NPM-Dec312025",
 client: "Northline Precision Manufacturing Inc.",
 type: "Audit (AUD)",
 yearEnd: "Dec 31, 2025",
 status: "In Progress",
 region: "ca",
 jurisdiction: "CA-ON",
 },
 "COM-CON-Dec312024": {
 id: "COM-CON-Dec312024",
 client: "Shipping Line Inc.",
 type: "Compilation (COM)",
 yearEnd: "Dec 31, 2024",
 status: "In Progress",
 region: "ca",
 jurisdiction: "CA-ON",
 },
 "COM-PSP-Dec312023": {
 id: "COM-PSP-Dec312023",
 client: "Source 40",
 type: "Compilation (COM)",
 yearEnd: "Dec 31, 2023",
 status: "In Progress",
 region: "ca",
 jurisdiction: "CA-ON",
 },
 "COM-QB-Dec312025": {
 id: "COM-QB-Dec312025",
 client: "qb 40.1",
 type: "Compilation (COM)",
 yearEnd: "Dec 31, 2025",
 status: "In Progress",
 region: "ca",
 jurisdiction: "CA-ON",
 },
 "AUD-SL-Mar312024": {
 id: "AUD-SL-Mar312024",
 client: "Shipping Line Inc.",
 type: "Audit (AUD)",
 yearEnd: "Mar 31, 2024",
 status: "In Progress",
 region: "ca",
 jurisdiction: "CA-ON",
 },
 "REV-SL-Jun302024": {
 id: "REV-SL-Jun302024",
 client: "Shipping Line Inc.",
 type: "Review (REV)",
 yearEnd: "Jun 30, 2024",
 status: "In Progress",
 region: "ca",
 jurisdiction: "CA-ON",
 },
 "COM-S40-Jun302024": {
 id: "COM-S40-Jun302024",
 client: "Source 40",
 type: "Compilation (COM)",
 yearEnd: "Jun 30, 2024",
 status: "In Progress",
 region: "ca",
 jurisdiction: "CA-ON",
 },
 "AUD-US-Dec312024": {
 id: "AUD-US-Dec312024",
 client: "Harbor Freight Logistics LLC",
 type: "Audit (GAAS/US)",
 yearEnd: "Dec 31, 2024",
 status: "In Progress",
 region: "us",
 jurisdiction: "US-NY",
 },
};

// Get unique clients from engagements
const getUniqueClients = () => {
 const clients = new Set<string>();
 Object.values(engagementsData).forEach(e => clients.add(e.client));
 return Array.from(clients);
};

// Get engagements for a specific client
const getEngagementsForClient = (clientName: string) => {
 return Object.values(engagementsData).filter(e => e.client === clientName);
};

// Fallback checklist when no saved checklist exists — uses the latest global template library
const fallbackChecklist: Checklist = generateClientAcceptanceContinuanceChecklist();

// Default Compilation-folder checklists seeded into the engagement on first load
const COMPILATION_FOLDER_ID = "5";
const COMPILATION_FOLDER_NAME = "Compilation Checklists";
const buildDefaultCompilationChecklists = () => {
 const items = [
 { generator: generateClientAcceptanceContinuanceChecklist, id: "default-compilation-cac" },
 { generator: generateIndependenceChecklist, id: "default-compilation-independence" },
 { generator: generateKnowledgeOfClientBusinessChecklist, id: "default-compilation-kcb" },
 { generator: generatePlanningChecklist, id: "default-compilation-planning" },
 { generator: generateEngagementLetterChecklist, id: "default-compilation-el" },
 { generator: generateManagementResponsibilityChecklist, id: "default-compilation-mr" },
 ];
 return items.map(({ generator, id }) => {
 const data = generator();
 return {
 id,
 name: data.title,
 folderId: COMPILATION_FOLDER_ID,
 folderName: COMPILATION_FOLDER_NAME,
 data,
 };
 });
};

const AUDIT_FOLDER_ID = "6";
const AUDIT_FOLDER_NAME = "Audit Checklists";
const buildDefaultAuditChecklists = () => {
 const items = [
 // Client Onboarding
 { generator: generateForm408InitialAuditEngagements, id: "default-audit-form-408" },
 { generator: generateForm410AcceptanceContinuance, id: "default-audit-form-410" },
 { generator: generateNewEngagementAcceptanceChecklist, id: "default-audit-new-accept" },
 { generator: generateExistingEngagementContinuanceChecklist, id: "default-audit-exist-cont" },
 { generator: generateAuditIndependenceChecklist, id: "default-audit-ind" },
 { generator: generateAuditEngagementLetterChecklist, id: "default-audit-el" },
 { generator: generateLetterToPredecessorAccountingFirmChecklist, id: "default-audit-pred" },
 { generator: generateAMLComplianceChecklist, id: "default-audit-aml" },
 // Planning
 { generator: generateUnderstandingEntityBasicsChecklist, id: "default-audit-ueb" },
 { generator: generateUnderstandingEntitySystemsChecklist, id: "default-audit-ues" },
 { generator: generateUnderstandingEntityIndustryEnvironmentChecklist, id: "default-audit-uei" },
 { generator: generateEngagementPlanningChecklist, id: "default-audit-plan" },
 { generator: generateAuditMaterialityChecklist, id: "default-audit-mat" },
 { generator: generateSelectingAuditorExpertChecklist, id: "default-audit-sae" },
 { generator: generateTCWGPlanningCommunicationChecklist, id: "default-audit-tcwg-pl" },
 { generator: generateEngagementScopeChecklist, id: "default-audit-scope" },
 { generator: generatePreliminaryAnalyticalProceduresChecklist, id: "default-audit-pap" },
 { generator: generateAuditStrategyMemorandumChecklist, id: "default-audit-asm" },
 { generator: generateStaffingTimeBudgetChecklist, id: "default-audit-stb" },
 // Risk Assessment
 { generator: generate500OIChecklist, id: "default-audit-ra-oi" },
 { generator: generate501APAPChecklist, id: "default-audit-ra-pap501a" },
 { generator: generate505MgmtInquiriesChecklist, id: "default-audit-ra-505" },
 { generator: generate506FraudIdentificationChecklist, id: "default-audit-ra-506" },
 { generator: generateRiskAssessmentProceduresChecklist, id: "default-audit-ra-rap" },
 { generator: generateUnderstandingInternalControlsChecklist, id: "default-audit-ra-ic" },
 { generator: generateITGeneralControlsChecklist, id: "default-audit-ra-itgc" },
 { generator: generateFraudRiskAssessmentChecklist, id: "default-audit-ra-fraud" },
 { generator: generateSignificantRisksRegisterChecklist, id: "default-audit-ra-srr" },
 { generator: generateRMMChecklist, id: "default-audit-ra-rmm" },
 { generator: generateSCOTRevenueCycleChecklist, id: "default-audit-ra-scot-rev" },
 { generator: generateSCOTExpenditureCycleChecklist, id: "default-audit-ra-scot-exp" },
 { generator: generateSCOTPayrollCycleChecklist, id: "default-audit-ra-scot-pay" },
 { generator: generateGoingConcernInitialAssessmentChecklist, id: "default-audit-ra-gc" },
 { generator: generate510IdentifyingRisksChecklist, id: "default-audit-ra-510" },
 { generator: generate511ITEnvironmentChecklist, id: "default-audit-ra-511" },
 { generator: generate513AccountingEstimatesChecklist, id: "default-audit-ra-513" },
 { generator: generate515RelatedPartiesChecklist, id: "default-audit-ra-515" },
 { generator: generate525GoingConcernChecklist, id: "default-audit-ra-525" },
 { generator: generate530PervasiveRisksChecklist, id: "default-audit-ra-530" },
 { generator: generate535InfoSystemChecklist, id: "default-audit-ra-535" },
 { generator: generate550ControlActivitiesChecklist, id: "default-audit-ra-550" },
 { generator: generate551ITGCChecklist, id: "default-audit-ra-551" },
 { generator: generate580SignificantDeficienciesChecklist, id: "default-audit-ra-580" },
 { generator: generate605RespondingToRiskChecklist, id: "default-audit-rp-605" },
 { generator: generate645LitigationClaimsChecklist, id: "default-audit-rp-645" },
 { generator: generate650SubsequentEventsChecklist2, id: "default-audit-rp-650" },
 { generator: generate670JournalEntryTestingChecklist, id: "default-audit-rp-670" },
 // Financial Statements
 { generator: generateAuditorsReportChecklist, id: "default-audit-ar" },
 // Completion & Signoffs — Modified Opinion / Audit Completion
 { generator: generateModifiedOpinionChecklist, id: "default-audit-so-306" },
 { generator: generateForm310AuditCompletionChecklist, id: "default-audit-so-310" },
 { generator: generateForm312EngagementPartnerChecklist, id: "default-audit-so-312" },
 { generator: generateSupplementaryInfoChecklist, id: "default-audit-so-313" },
 { generator: generateAccumulationOfMisstatementsChecklist, id: "default-audit-so-aim" },
 { generator: generateFinalAnalyticalReviewChecklist, id: "default-audit-so-far" },
 { generator: generateSubsequentEventsChecklist, id: "default-audit-subseq" },
 { generator: generateGoingConcernFinalAssessmentChecklist, id: "default-audit-wgc-final" },
 { generator: generateManagementRepresentationsChecklist, id: "default-audit-mr" },
 { generator: generateTCWGFinalCommunicationChecklist, id: "default-audit-tcwg-fin" },
 { generator: generateAuditCACompletionChecklist, id: "default-audit-comp" },
 { generator: generateAuditCADisclosureChecklist, id: "default-audit-disc" },
 { generator: generateEngagementPartnerAuditCompletionChecklist, id: "default-audit-ep" },
 { generator: generateAuditWorksheetWithdrawalCA, id: "default-audit-so-311" },
 { generator: generateAuditWorksheetSignificantDecisionsCA, id: "default-audit-so-320" },
 { generator: generateAuditWorksheetKeyAuditMattersCA, id: "default-audit-so-325" },
 { generator: generateAuditWorksheetFindingsCA, id: "default-audit-so-330" },
 { generator: generateAuditWorksheetSummaryMisstatementsCA, id: "default-audit-so-335" },
 { generator: generateAuditWorksheetMattersCommunicatedCA, id: "default-audit-so-340" },
 { generator: generateAuditWorksheetFutureConsiderationCA, id: "default-audit-so-370" },
 { generator: generateAuditWorksheetDocumentingConsultationCA, id: "default-audit-so-375" },
 ];
 return items.map(({ generator, id }) => {
 const data = generator();
 return {
 id,
 name: data.title,
 folderId: AUDIT_FOLDER_ID,
 folderName: AUDIT_FOLDER_NAME,
 data,
 };
 });
};

const US_AUDIT_FOLDER_ID = "7";
const US_AUDIT_FOLDER_NAME = "US Audit Checklists";
const buildDefaultUSAuditChecklists = () => {
 const items = [
 // Client Onboarding & Planning
 { generator: generateUSForm408InitialAuditEngagements, id: "default-us-audit-form-408" },
 { generator: generateUSForm410AcceptanceContinuance, id: "default-us-audit-form-410" },
 { generator: generateUSNewEngagementAcceptanceChecklist, id: "default-us-audit-new-accept" },
 { generator: generateUSExistingEngagementContinuanceChecklist, id: "default-us-audit-exist-cont" },
 { generator: generateUSAuditIndependenceChecklist, id: "default-us-audit-ind" },
 { generator: generateAuditEngagementLetterGAASUSGAAP, id: "default-us-audit-el" },
 { generator: generateLetterToPredecessorAccountingFirmChecklist, id: "default-us-audit-pred" },
 { generator: generateUSAMLComplianceChecklist, id: "default-us-audit-aml" },
 { generator: generateUSUnderstandingEntityBasicsChecklist, id: "default-us-audit-ueb" },
 { generator: generateUSUnderstandingEntitySystemsChecklist, id: "default-us-audit-ues" },
 { generator: generateUSUnderstandingEntityIndustryChecklist, id: "default-us-audit-uei" },
 { generator: generateUSEngagementPlanningChecklist, id: "default-us-audit-plan" },
 { generator: generateUSAuditMaterialityChecklist, id: "default-us-audit-mat" },
 { generator: generateUSSelectingAuditorExpertChecklist, id: "default-us-audit-sae" },
 { generator: generateCommunicationTCWGPlanningUS, id: "default-us-audit-tcwg-pl" },
 { generator: generateUSEngagementScopeChecklist, id: "default-us-audit-scope" },
 { generator: generateUSPreliminaryAnalyticalProceduresChecklist, id: "default-us-audit-pap" },
 { generator: generateUSAuditStrategyMemorandumChecklist, id: "default-us-audit-asm" },
 { generator: generateUSStaffingTimeBudgetChecklist, id: "default-us-audit-stb" },
 // Risk Assessment
 { generator: generateUSRiskAssessmentProceduresChecklist, id: "default-us-audit-ra-rap" },
 { generator: generateUSUnderstandingInternalControlsChecklist, id: "default-us-audit-ra-ic" },
 { generator: generateUSITGeneralControlsChecklist, id: "default-us-audit-ra-itgc" },
 { generator: generateUSFraudRiskAssessmentChecklist, id: "default-us-audit-ra-fraud" },
 { generator: generateUSSignificantRisksRegisterChecklist, id: "default-us-audit-ra-srr" },
 { generator: generateUSRMMChecklist, id: "default-us-audit-ra-rmm" },
 { generator: generateUSSCOTRevenueCycleChecklist, id: "default-us-audit-ra-scot-rev" },
 { generator: generateUSSCOTExpenditureCycleChecklist, id: "default-us-audit-ra-scot-exp" },
 { generator: generateUSSCOTPayrollCycleChecklist, id: "default-us-audit-ra-scot-pay" },
 { generator: generateUSGoingConcernInitialAssessmentChecklist, id: "default-us-audit-ra-gc" },
 // Response to Assessed Risks & Financial Statements
 { generator: generateUSOverallAuditResponseChecklist, id: "default-us-audit-rp-oar" },
 { generator: generateUSTestOfControlsChecklist, id: "default-us-audit-rp-toc" },
 { generator: generateUSSubstantiveAnalyticalProceduresChecklist, id: "default-us-audit-rp-sap" },
 { generator: generateUSTestOfDetailsRevenueChecklist, id: "default-us-audit-rp-tod-rev" },
 { generator: generateUSTestOfDetailsExpensesChecklist, id: "default-us-audit-rp-tod-exp" },
 { generator: generateUSIndependentAuditorsReportChecklist, id: "default-us-audit-ar" },
 // Completion & Signoffs
 { generator: generateUSAccumulationOfMisstatementsChecklist, id: "default-us-audit-so-aim" },
 { generator: generateUSFinalAnalyticalReviewChecklist, id: "default-us-audit-so-far" },
 { generator: generateUSSubsequentEventsChecklist, id: "default-us-audit-subseq" },
 { generator: generateUSGoingConcernFinalAssessmentChecklist, id: "default-us-audit-wgc-final" },
 { generator: generateManagementRepLetterAUC580, id: "default-us-audit-mr" },
 { generator: generateCommunicationTCWGFinalUS, id: "default-us-audit-tcwg-fin" },
 { generator: generateUSAuditCompletionChecklist, id: "default-us-audit-comp" },
 { generator: generateUSQualityControlReviewChecklist, id: "default-us-audit-ep" },
 // Letters (exist in globalTemplates but were not seeded)
 { generator: generateInquiryToLegalCounselUS, id: "default-us-audit-legal-inquiry" },
 { generator: generateCommunicationToPredecessorAuditorUS, id: "default-us-audit-predecessor" },
 { generator: generateLetterToManagementSignificantDeficienciesUS, id: "default-us-audit-sig-def" },
 // Completion worksheets (exist in globalTemplates but were not seeded)
 { generator: generateAuditWorksheetSignificantDecisionsUS, id: "default-us-audit-so-sd" },
 { generator: generateAuditWorksheetKeyAuditMattersUS, id: "default-us-audit-so-kam" },
 { generator: generateAuditWorksheetFindingsUS, id: "default-us-audit-so-find" },
 { generator: generateAuditWorksheetMattersCommunicatedUS, id: "default-us-audit-so-mc" },
 { generator: generateAuditWorksheetFutureConsiderationUS, id: "default-us-audit-so-fc" },
 { generator: generateAuditWorksheetDocumentingConsultationUS, id: "default-us-audit-so-dc" },
 { generator: generateAuditWorksheetWithdrawalUS, id: "default-us-audit-so-wd" },
 // Response to Assessed Risks — Procedures Summary (CA equivalent was used; now US-specific)
 { generator: generateAuditProceduresSummaryChecklist, id: "default-us-audit-rp-aps" },
 // New US-specific worksheets
 { generator: generateUSJournalEntryTestingLog, id: "default-us-audit-ra-je" },
 { generator: generateUSRelatedPartyTransactionsWorksheet, id: "default-us-audit-rp-rpt" },
 { generator: generateUSGoodwillImpairmentAssessment, id: "default-us-audit-rp-gwi" },
 ];
 return items.map(({ generator, id }) => {
 const data = generator();
 return {
 id,
 name: data.title,
 folderId: US_AUDIT_FOLDER_ID,
 folderName: US_AUDIT_FOLDER_NAME,
 data,
 };
 });
};

// Custom TB Check icon component
const TBCheckIcon = ({
 className
}: {
 className?: string;
}) => <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
 <path d="M7.84228 5.33609V8.00276M7.84228 10.6694H7.84895M6.91916 1.93057L1.43591 11.4017C1.13177 11.927 0.979701 12.1896 1.00218 12.4052C1.02178 12.5933 1.12029 12.7641 1.2732 12.8753C1.4485 13.0028 1.75201 13.0028 2.35903 13.0028H13.3255C13.9326 13.0028 14.2361 13.0028 14.4114 12.8753C14.5643 12.7641 14.6628 12.5933 14.6824 12.4052C14.7049 12.1896 14.5528 11.927 14.2487 11.4017L8.76541 1.93057C8.46236 1.40713 8.31084 1.14541 8.11315 1.05751C7.94071 0.980831 7.74386 0.980831 7.57142 1.05751C7.37373 1.14541 7.22221 1.40713 6.91916 1.93057Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
 </svg>;

// Header action buttons
const inlineHeaderActions = [{
 id: "tb",
 label: "TB Check",
 icon: TBCheckIcon
}, {
 id: "adj",
 label: "Adj. Entries",
 icon: PencilLine
}, {
 id: "workbook",
 label: "Workbook",
 icon: FileSpreadsheet
}];

const toolsMenuActions = [{
 id: "bank",
 label: "Connect Bank",
 icon: Landmark
}, {
 id: "docs",
 label: "Source Docs",
 icon: FileText
}];
// Adapt form 410 content to new vs. existing engagement at render time.
function adaptForm410ForEngagement(data: any, firstYearAudit: boolean): any {
 const title = firstYearAudit
 ? 'New Engagement — Acceptance/Continuance'
 : 'Existing Engagement — Acceptance/Continuance';
 // For existing engagements: remove the "complete" note sentence and strip the new-only q.
 // For new engagements: remove the "continuing engagement" prior-risk question.
 const note = firstYearAudit
 ? data.note
 : (typeof data.note === 'string'
 ? data.note.replace(/For first year audit engagements[^<]*complete Form 408[^<]*<\/p>\s*/gi, '').trim()
 : data.note);
 const sections = Array.isArray(data.sections)
 ? data.sections.map((sec: any) => ({
...sec,
 questions: Array.isArray(sec.questions)
 ? sec.questions.filter((q: any) => {
 // 'f410-conc-prior-risk' / 'us-f410-conc-prior-risk' are continuing-only
 if (firstYearAudit && (q.id === 'f410-conc-prior-risk' || q.id === 'us-f410-conc-prior-risk')) return false;
 return true;
 })
 : sec.questions,
 }))
 : data.sections;
 return {...data, title, note, sections };
}

// Map sidebar nav keys (e.g. "co-ca") to seeded checklist ids.
const NAV_KEY_TO_CHECKLIST_ID: Record<string, string> = {
 // Compilation
 "co-ca": "default-compilation-cac",
 "co-ind": "default-compilation-independence",
 "co-kcb": "default-compilation-kcb",
 "co-pl": "default-compilation-planning",
 "co-el": "default-compilation-el",
 "co-mr": "default-compilation-mr",
 // Audit — Client Onboarding
 "aud-form-408": "default-audit-form-408",
 "aud-form-410": "default-audit-form-410",
 "aud-el": "default-audit-el",
 "aud-pred": "default-audit-pred",
 // Audit — Planning
 "aud-ueb": "default-audit-ueb",
 "aud-ues": "default-audit-ues",
 "aud-uei": "default-audit-uei",
 "aud-plan": "default-audit-plan",
 "aud-mat": "default-audit-mat",
 "aud-sae": "default-audit-sae",
 "aud-tcwg-pl": "default-audit-tcwg-pl",
 "aud-scope": "default-audit-scope",
 "aud-pap": "default-audit-pap",
 "aud-asm": "default-audit-asm",
 "aud-stb": "default-audit-stb",
 // Audit — Risk Assessment
 "aud-ra-oi": "default-audit-ra-oi",
 "aud-us-ra-oi": "default-audit-ra-oi",
 "aud-ra-pap501a": "default-audit-ra-pap501a",
 "aud-ra-505": "default-audit-ra-505",
 "aud-ra-506": "default-audit-ra-506",
 "aud-ra-rap": "default-audit-ra-rap",
 "aud-ra-ic": "default-audit-ra-ic",
 "aud-ra-itgc": "default-audit-ra-itgc",
 "aud-ra-fraud": "default-audit-ra-fraud",
 "aud-ra-srr": "default-audit-ra-srr",
 "aud-ra-rmm": "default-audit-ra-rmm",
 "aud-ra-scot-rev": "default-audit-ra-scot-rev",
 "aud-ra-scot-exp": "default-audit-ra-scot-exp",
 "aud-ra-scot-pay": "default-audit-ra-scot-pay",
 "aud-ra-gc": "default-audit-ra-gc",
 "aud-ra-510": "default-audit-ra-510",
 "aud-ra-511": "default-audit-ra-511",
 "aud-ra-513": "default-audit-ra-513",
 "aud-ra-515": "default-audit-ra-515",
 "aud-ra-525": "default-audit-ra-525",
 "aud-ra-530": "default-audit-ra-530",
 "aud-ra-535": "default-audit-ra-535",
 "aud-ra-550": "default-audit-ra-550",
 "aud-ra-551": "default-audit-ra-551",
 "aud-ra-580": "default-audit-ra-580",
 "aud-rp-605": "default-audit-rp-605",
 "aud-rp-645": "default-audit-rp-645",
 "aud-rp-650": "default-audit-rp-650",
 "aud-rp-670": "default-audit-rp-670",
 // Audit — Financial Statements
 "aud-ar": "default-audit-ar",
 // Audit — Completion & Signoffs — Modified Opinion / Audit Completion / Withdrawal
 "aud-so-306": "default-audit-so-306",
 "aud-so-310": "default-audit-so-310",
 "aud-so-311": "default-audit-so-311",
 "aud-so-312": "default-audit-so-312",
 "aud-so-313": "default-audit-so-313",
 "aud-so-320": "default-audit-so-320",
 "aud-so-325": "default-audit-so-325",
 "aud-so-330": "default-audit-so-330",
 "aud-so-335": "default-audit-so-335",
 "aud-so-340": "default-audit-so-340",
 "aud-so-370": "default-audit-so-370",
 "aud-so-375": "default-audit-so-375",
 "aud-so-aim": "default-audit-so-aim",
 "aud-so-far": "default-audit-so-far",
 "aud-subseq": "default-audit-subseq",
 "aud-wgc-final": "default-audit-wgc-final",
 "aud-mr": "default-audit-mr",
 "aud-tcwg-fin": "default-audit-tcwg-fin",
 "aud-comp": "default-audit-comp",
 "aud-disc": "default-audit-disc",
 "aud-ep": "default-audit-ep",
 // US Audit (GAAS) — Client Onboarding
 "aud-us-form-408": "default-us-audit-form-408",
 "aud-us-form-410": "default-us-audit-form-410",
 "aud-us-el": "default-us-audit-el",
 "aud-us-pred": "default-us-audit-pred",
 // US Audit — Planning
 "aud-us-ueb": "default-us-audit-ueb",
 "aud-us-ues": "default-us-audit-ues",
 "aud-us-uei": "default-us-audit-uei",
 "aud-us-plan": "default-us-audit-plan",
 "aud-us-mat": "default-us-audit-mat",
 "aud-us-sae": "default-us-audit-sae",
 "aud-us-tcwg-pl": "default-us-audit-tcwg-pl",
 "aud-us-scope": "default-us-audit-scope",
 "aud-us-pap": "default-us-audit-pap",
 "aud-us-asm": "default-us-audit-asm",
 "aud-us-stb": "default-us-audit-stb",
 // US Audit — Risk Assessment
 "aud-us-ra-rap": "default-us-audit-ra-rap",
 "aud-us-ra-ic": "default-us-audit-ra-ic",
 "aud-us-ra-itgc": "default-us-audit-ra-itgc",
 "aud-us-ra-fraud": "default-us-audit-ra-fraud",
 "aud-us-ra-srr": "default-us-audit-ra-srr",
 "aud-us-ra-rmm": "default-us-audit-ra-rmm",
 "aud-us-ra-scot-rev": "default-us-audit-ra-scot-rev",
 "aud-us-ra-scot-exp": "default-us-audit-ra-scot-exp",
 "aud-us-ra-scot-pay": "default-us-audit-ra-scot-pay",
 "aud-us-ra-gc": "default-us-audit-ra-gc",
 // US Audit — Response to Assessed Risks
 "aud-us-rp-oar": "default-us-audit-rp-oar",
 "aud-us-rp-toc": "default-us-audit-rp-toc",
 "aud-us-rp-sap": "default-us-audit-rp-sap",
 "aud-us-rp-tod-rev": "default-us-audit-rp-tod-rev",
 "aud-us-rp-tod-exp": "default-us-audit-rp-tod-exp",
 "aud-us-rp-aps": "default-us-audit-rp-aps",
 // US Audit — Financial Statements
 "aud-us-ar": "default-us-audit-ar",
 // US Audit — Completion & Signoffs
 "aud-us-so-aim": "default-us-audit-so-aim",
 "aud-us-so-far": "default-us-audit-so-far",
 "aud-us-subseq": "default-us-audit-subseq",
 "aud-us-wgc-final": "default-us-audit-wgc-final",
 "aud-us-mr": "default-us-audit-mr",
 "aud-us-tcwg-fin": "default-us-audit-tcwg-fin",
 "aud-us-comp": "default-us-audit-comp",
 "aud-us-ep": "default-us-audit-ep",
 // US Audit — Letters wired up
 "aud-us-sig-def": "default-us-audit-sig-def",
 // US Audit — Completion worksheets wired up
 "aud-us-so-sd": "default-us-audit-so-sd",
 "aud-us-so-kam": "default-us-audit-so-kam",
 "aud-us-so-find": "default-us-audit-so-find",
 "aud-us-so-mc": "default-us-audit-so-mc",
 "aud-us-so-fc": "default-us-audit-so-fc",
 "aud-us-so-dc": "default-us-audit-so-dc",
 "aud-us-so-wd": "default-us-audit-so-wd",
 // US Audit — New worksheets
 "aud-us-ra-je": "default-us-audit-ra-je",
 "aud-us-rp-rpt": "default-us-audit-rp-rpt",
 "aud-us-rp-gwi": "default-us-audit-rp-gwi",
};

const CUSTOM_WORKSHEET_TITLES: Record<string, string> = {
 'aud-plan': 'Team Planning Discussions', 'aud-us-plan': 'Team Planning Discussions',
 'aud-mat': 'Materiality', 'aud-us-mat': 'Materiality',
 'aud-tt': 'Time Tracker', 'aud-us-tt': 'Time Tracker',
 'aud-iar': 'Management Requests', 'aud-us-iar': 'Management Requests',
 'aud-form-440': '440 — Information / Analysis Requested from Management',
 'aud-us-form-440': '440 — Information / Analysis Requested from Management',
 'aud-scope': 'Audit Scope', 'aud-us-scope': 'Audit Scope',
 'aud-pap': 'Preliminary Analytical Procedures', 'aud-us-pap': 'Preliminary Analytical Procedures',
 'aud-sae': "Using the Work of an Auditor's Expert", 'aud-us-sae': "Using the Work of an Auditor's Expert",
 'aud-asm': 'Overall Audit Strategy', 'aud-us-asm': 'Overall Audit Strategy',

 'aud-ra-pap501a': '501-B — Preliminary Analytical Procedures',
 'aud-ra-pap501bc': '501-A — Preliminary Analytical Procedures',
 'aud-ra-507': 'Minutes of Governance Meetings',
 'aud-ra-510': 'Identifying Risks through Understanding the Entity',
 'aud-ra-511': 'Understanding the IT Environment',
 'aud-ra-513': 'Understanding Accounting Estimates and Related Disclosures',
 'aud-ra-514': 'Outcome of Prior Period Accounting Estimates',
 'aud-ra-515': 'Understanding Related Party Relationships and Transactions',
 'aud-ra-520': 'Risk Register — Identifying and Assessing Risks of Material Misstatement',
 'aud-ra-535': 'Understanding the Information System and Communication',
 'aud-ra-540': 'Control Design / Implementation Assessment',
 'aud-ra-550': 'Control Activities — Design, Implementation and Control Risk',
 'aud-ra-551': 'Understanding General IT Controls — Design and Implementation',
 'aud-ra-575': 'Internal Control Deficiencies Identified',
 'aud-ra-580': 'Revenue Recognition — Fraud Risk Assessment',
 'aud-ra-590': 'Engagement Scoping — Classes of Transactions, Account Balances and Disclosures',
 'aud-rp-605': 'Responding to Risk at the Financial Statement Level',
 'aud-rp-610': 'Sampling — Tests of Details',
 'aud-rp-625': 'Going-Concern Evaluation',
 'aud-rp-630': 'Summary of External Confirmations',
 'aud-rp-635': 'Accounting Estimates — Further Audit Procedures',
 'aud-rp-645': 'Litigation, Claims and Non-Compliance',
 'aud-rp-650': 'Subsequent Events',
 'aud-rp-655': 'Final Analytical Procedures',
 'aud-rp-666': 'Related-Party Transactions',
 'aud-rp-670': 'Use of Journal Entries',
 'aud-rp-680': 'ASPE Supplementary Audit Procedures',
 'aud-so-sign': 'SO Signoffs',
 'aud-so-fr': 'FR Final Review',
};

// All custom-component worksheet pages (not checklist-based) that support PDF/Word export
const WORKSHEET_KEYS = new Set([
 'aud-asm', 'aud-us-asm',
 'aud-plan', 'aud-us-plan',
 'aud-scope', 'aud-us-scope',
 'aud-pap', 'aud-us-pap',
 'aud-sae', 'aud-us-sae',
 'aud-mat', 'aud-us-mat',
 'aud-tt', 'aud-us-tt',
 'aud-iar', 'aud-us-iar',
 'aud-form-440', 'aud-us-form-440',
 'aud-ra-pap501bc', 'aud-ra-pap501',
 'aud-ra-507', 'aud-ra-510', 'aud-ra-511', 'aud-ra-513', 'aud-ra-514', 'aud-ra-515',
 'aud-ra-520', 'aud-ra-535', 'aud-ra-540', 'aud-ra-550', 'aud-ra-551',
 'aud-ra-575', 'aud-ra-580', 'aud-ra-590',
 'aud-rp-605', 'aud-rp-610', 'aud-rp-625', 'aud-rp-630', 'aud-rp-635',
 'aud-rp-645', 'aud-rp-650', 'aud-rp-655', 'aud-rp-666', 'aud-rp-670', 'aud-rp-680',
 'aud-so-311', 'aud-so-320', 'aud-so-325', 'aud-so-330', 'aud-so-335', 'aud-so-340', 'aud-so-370', 'aud-so-375', 'aud-so-aim',
 'aud-us-so-aim',
 'aud-so-sign', 'aud-so-fr',
]);

const FS_PAGE_KEYS = new Set([
 'aud-fs-cover', 'aud-fs-toc', 'aud-fs-iar', 'aud-fs-bs', 'aud-fs-is', 'aud-fs-cf', 'aud-fs-eq', 'aud-fs-notes',
 'aud-us-fs-cover', 'aud-us-fs-toc', 'aud-us-fs-bs', 'aud-us-fs-is', 'aud-us-fs-cf', 'aud-us-fs-eq', 'aud-us-fs-notes',
 // Compilation / Review FS
 'fs-cover', 'fs-toc', 'fs-comp', 'fs-bs', 'fs-is', 'fs-cf', 'fs-notes',
]);
const FS_PAGE_TYPE_MAP: Record<string, FSPageType> = {
 'aud-fs-cover': 'cover', 'aud-fs-toc': 'toc', 'aud-fs-iar': 'auditor-report',
 'aud-fs-bs': 'bs', 'aud-fs-is': 'is', 'aud-fs-cf': 'cf', 'aud-fs-eq': 'eq', 'aud-fs-notes': 'notes',
 'aud-us-fs-cover': 'cover', 'aud-us-fs-toc': 'toc', 'aud-us-fs-bs': 'bs',
 'aud-us-fs-is': 'is', 'aud-us-fs-cf': 'cf', 'aud-us-fs-eq': 'eq', 'aud-us-fs-notes': 'notes',
 // Compilation / Review FS
 'fs-cover': 'cover', 'fs-toc': 'toc', 'fs-comp': 'comp-report',
 'fs-bs': 'bs', 'fs-is': 'is', 'fs-cf': 'cf', 'fs-notes': 'notes',
};
const FS_SCREEN_NAMES: Record<FSPageType, string> = {
 'cover': 'Cover Page', 'toc': 'Table of Contents',
 'bs': 'Balance Sheet', 'is': 'Statement of Income Loss',
 'cf': 'Statement of Cash Flows', 'eq': 'Statement of Equity',
 'auditor-report': "Independent Auditor's Report",
 'notes': 'Notes to Financial Information', 'comp-report': 'Compilation Report',
};

// Maps savedChecklist.id → sidebar nav item (section, code, label) matching the engagement menu exactly.
// Sub-forms that share a parent sidebar nav item use that item's code+label so they aggregate in the summary.
const CHECKLIST_SIDEBAR_INFO: Record<string, { section: string; code: string; label: string }> = {
 // Compilation — CO
 'default-compilation-cac': { section: 'CO', code: 'CAC', label: 'Client Acceptance & Continuance' },
 'default-compilation-independence': { section: 'CO', code: 'IND', label: 'Independence' },
 'default-compilation-kcb': { section: 'CO', code: 'KCB', label: 'Knowledge of Client Business' },
 'default-compilation-planning': { section: 'CO', code: 'PL', label: 'Planning' },
 'default-compilation-el': { section: 'CO', code: 'AL1.1', label: 'Engagement Letter' },
 'default-compilation-mr': { section: 'CO', code: 'MR', label: 'Management Responsibility' },
 // CA Audit — CO (sub-forms that share a sidebar nav item use that item's code+label)
 'default-audit-form-408': { section: 'CO', code: 'IAE', label: 'Initial Audit Engagements' },
 'default-audit-form-410': { section: 'CO', code: 'AC', label: 'New or Existing Engagement — Acceptance/Continuance' },
 'default-audit-new-accept': { section: 'CO', code: 'AC', label: 'New or Existing Engagement — Acceptance/Continuance' },
 'default-audit-exist-cont': { section: 'CO', code: 'AC', label: 'New or Existing Engagement — Acceptance/Continuance' },
 'default-audit-ind': { section: 'CO', code: 'AC', label: 'New or Existing Engagement — Acceptance/Continuance' },
 'default-audit-aml': { section: 'CO', code: 'AC', label: 'New or Existing Engagement — Acceptance/Continuance' },
 'default-audit-tcwg-pl': { section: 'CO', code: 'AC', label: 'New or Existing Engagement — Acceptance/Continuance' },
 'default-audit-el': { section: 'CO', code: 'AL1.1', label: 'Engagement Letter' },
 'default-audit-pred': { section: 'CO', code: 'AL1.4', label: 'Letter to a predecessor accounting firm' },
 'default-us-audit-pred': { section: 'CO', code: 'AL1.4', label: 'Letter to a predecessor accounting firm' },
 // CA Audit — PL (sub-forms without sidebar routes are grouped under their closest parent)
 'default-audit-mat': { section: 'PL', code: 'PL1', label: 'Materiality' },
 'default-audit-sae': { section: 'PL', code: 'SAE', label: "Selecting Auditor's Expert" },
 'default-audit-asm': { section: 'PL', code: 'OAS', label: 'Overall Audit Strategy' },
 'default-audit-ueb': { section: 'PL', code: 'OAS', label: 'Overall Audit Strategy' },
 'default-audit-ues': { section: 'PL', code: 'OAS', label: 'Overall Audit Strategy' },
 'default-audit-uei': { section: 'PL', code: 'OAS', label: 'Overall Audit Strategy' },
 'default-audit-pap': { section: 'PL', code: 'OAS', label: 'Overall Audit Strategy' },
 'default-audit-scope': { section: 'PL', code: 'OAS', label: 'Overall Audit Strategy' },
 'default-audit-plan': { section: 'PL', code: 'TPD', label: 'Team Planning Discussions' },
 'default-audit-tb': { section: 'PL', code: 'TB', label: 'Time Budget' },
 'default-audit-stb': { section: 'PL', code: 'TB', label: 'Time Budget' },
 'default-audit-db': { section: 'PL', code: 'DB', label: 'Detailed Budget' },
 // CA Audit — RA
 'default-audit-ra-rap': { section: 'RA', code: 'RAP', label: 'Risk Assessment Procedures' },
 'default-audit-ra-ic': { section: 'RA', code: 'IC', label: 'Understanding Internal Controls' },
 'default-audit-ra-itgc': { section: 'RA', code: 'ITGC', label: 'IT General Controls (ITGC)' },
 'default-audit-ra-fraud': { section: 'RA', code: 'FRA', label: 'Fraud Risk Assessment' },
 'default-audit-ra-srr': { section: 'RA', code: 'SRR', label: 'Significant Risks Register' },
 'default-audit-ra-rmm': { section: 'RA', code: 'RMM', label: 'Risk of Material Misstatement (RMM)' },
 'default-audit-ra-scot-rev': { section: 'RA', code: 'S1', label: 'SCOT — Revenue Cycle' },
 'default-audit-ra-scot-exp': { section: 'RA', code: 'S2', label: 'SCOT — Expenditure Cycle' },
 'default-audit-ra-scot-pay': { section: 'RA', code: 'S3', label: 'SCOT — Payroll Cycle' },
 'default-audit-ra-gc': { section: 'RA', code: 'GC', label: 'Going Concern (Initial Assessment)' },
 'default-audit-ra-510': { section: 'RA', code: '510', label: 'Identifying Risks through Understanding the Entity' },
 'default-audit-ra-511': { section: 'RA', code: '511', label: 'Understanding the IT Environment' },
 'default-audit-ra-513': { section: 'RA', code: '513', label: 'Understanding Accounting Estimates and Related Disclosures' },
 'default-audit-ra-515': { section: 'RA', code: '515', label: 'Understanding Related Parties' },
 'default-audit-ra-525': { section: 'RA', code: '525', label: 'Going Concern — Identifying Events and Conditions' },
 'default-audit-ra-530': { section: 'RA', code: '530', label: 'Pervasive Risks and Controls' },
 'default-audit-ra-535': { section: 'RA', code: '535', label: 'Understanding the Information System and Communication' },
 'default-audit-ra-550': { section: 'RA', code: '550', label: 'Control Activities — Design, Implementation and Control Risk' },
 'default-audit-ra-551': { section: 'RA', code: '551', label: 'General IT Controls — Design and Implementation' },
 'default-audit-ra-580': { section: 'RA', code: '580', label: 'Revenue Recognition — Fraud Risk Assessment' },
 // CA Audit — RP
 'default-audit-rp-605': { section: 'RP', code: 'RFS', label: 'Responding to Risk at the Financial Statement Level' },
 'default-audit-rp-645': { section: 'RP', code: 'LCN', label: 'Litigation, Claims and Non-Compliance' },
 'default-audit-rp-650': { section: 'RP', code: 'SUB', label: 'Subsequent Events' },
 'default-audit-rp-670': { section: 'RP', code: 'JET', label: 'Use of Journal Entries' },
 // CA Audit — FS
 'default-audit-ar': { section: 'FS', code: 'IAR', label: "Independent Auditor's Report" },
 'default-audit-so-306': { section: 'SO', code: '306', label: 'Modified Opinion' },
 'default-audit-so-310': { section: 'SO', code: '310', label: 'Audit Completion' },
 'default-audit-so-311': { section: 'SO', code: '311', label: 'Withdrawal' },
 'default-audit-so-312': { section: 'SO', code: '312', label: 'Engagement Partner — Audit Completion' },
 'default-audit-so-313': { section: 'SO', code: '313', label: 'Supplementary and Other Information' },
 'default-audit-so-320': { section: 'SO', code: '320', label: 'Notes on Significant Audit Decisions' },
 'default-audit-so-325': { section: 'SO', code: '325', label: 'Key Audit Matters' },
 'default-audit-so-330': { section: 'SO', code: '330', label: 'Audit Findings and Matters for Discussion' },
 'default-audit-so-335': { section: 'SO', code: '335', label: 'Summary of Identified Misstatements' },
 'default-audit-so-340': { section: 'SO', code: '340', label: 'Matters to be Communicated to Management and TCWG' },
 'default-audit-so-370': { section: 'SO', code: '370', label: 'Matters for Future Consideration' },
 'default-audit-so-375': { section: 'SO', code: '375', label: 'Documenting Consultation' },
 // CA Audit — SO
 'default-audit-so-aim': { section: 'SO', code: 'AIM', label: 'Accumulation of Identified Misstatements' },
 'default-audit-so-far': { section: 'SO', code: 'FAR', label: 'Final Analytical Review' },
 'default-audit-subseq': { section: 'SO', code: 'SE', label: 'Subsequent Events' },
 'default-audit-wgc-final': { section: 'SO', code: 'GC', label: 'Going Concern (Final Assessment)' },
 'default-audit-mr': { section: 'SO', code: 'MR', label: 'Management Representation Letter' },
 'default-audit-tcwg-fin': { section: 'SO', code: 'TCWG', label: 'Communication with Those Charged with Governance' },
 'default-audit-comp': { section: 'SO', code: 'CM', label: 'Completion' },
 'default-audit-disc': { section: 'SO', code: 'DC', label: 'Disclosure' },
 'default-audit-ep': { section: 'SO', code: 'QCR', label: 'Quality Control Review' },
};

const LEGACY_COMPILATION_CHECKLIST_IDS = new Set([
 "default-compilation-engagement-letter",
 "default-compilation-mgmt-responsibility",
]);

function FSCommentsBridge({ open, currentScreen }: { open: boolean; currentScreen: string }) {
 const { setPanelOpen, setCommentMode, setCurrentScreen } = useComments();
 useEffect(() => { setPanelOpen(open); }, [open, setPanelOpen]);
 useEffect(() => { setCommentMode(open); }, [open, setCommentMode]);
 useEffect(() => { setCurrentScreen(currentScreen); }, [currentScreen, setCurrentScreen]);
 return null;
}

function FSScrollCanvas({ children, onCommentsToggle }: { children: React.ReactNode; onCommentsToggle: (v: boolean) => void }) {
 const { commentMode, addComment, currentScreen, setActiveComposerPinId, setOpenCommentId } = useComments();

 const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
 if (!commentMode) return;
 const target = e.target as HTMLElement;
 if (target.closest("[data-comment-pin]") || target.closest("[data-comment-popover]")) return;
 const pageEl = e.currentTarget.querySelector<HTMLElement>("[data-fs-page]");
 if (!pageEl) return;
 const pageRect = pageEl.getBoundingClientRect();
 if (e.clientX < pageRect.left || e.clientX > pageRect.right ||
 e.clientY < pageRect.top || e.clientY > pageRect.bottom) return;
 const xPercent = ((e.clientX - pageRect.left) / pageRect.width) * 100;
 const yPercent = ((e.clientY - pageRect.top) / pageRect.height) * 100;
 const row = target.closest("[data-comment-row]") as HTMLElement | null;
 const lineItem = row?.getAttribute("data-comment-row") || undefined;
 const section = row?.getAttribute("data-comment-section") || undefined;
 const rowIndex = row ? parseInt(row.getAttribute("data-comment-index") || "0", 10) : undefined;
 const newId = addComment(
 { screen: currentScreen, section, lineItem, row: rowIndex, yPosition: yPercent, xPosition: xPercent },
 "", [], "draft"
 );
 setActiveComposerPinId(newId);
 setOpenCommentId(newId);
 };

 return (
 <div
 data-fs-scroll
 className={`relative flex-1 overflow-y-auto ${commentMode ? "comment-mode-active" : ""}`}
 style={{ cursor: commentMode ? "crosshair" : "default" }}
 onClick={handleCanvasClick}
 >
 <CommentPinsOverlay containerHeight={1191} />
 <CommentMinimap />
 {children}
 {commentMode && (
 <div
 className="sticky bottom-4 left-1/2 -translate-x-1/2 z-40 mx-auto flex items-center gap-2 px-4 py-2.5 rounded-full pointer-events-none"
 style={{
 width: "fit-content",
 background: "linear-gradient(135deg, hsl(270 70% 55% / 0.95), hsl(220 80% 55% / 0.95))",
 backdropFilter: "blur(12px)",
 boxShadow: "0 6px 24px hsl(270 60% 55% / 0.25)",
 color: "white",
 }}
 >
 <MessageSquare className="h-3.5 w-3.5" />
 <span className="text-[12px] font-medium">Click anywhere on the page to drop a pin</span>
 </div>
 )}
 </div>
 );
}

export default function EngagementDetail() {
 const {
 engagementId,
 checklistKey,
 } = useParams<{
 engagementId: string;
 checklistKey?: string;
 }>();
 const navigate = useNavigate();
 const [searchParams] = useSearchParams();
 const { isCollapsed: isPanelCollapsed, toggle: togglePanel } = useSecondaryPanel();
 const [checklist, setChecklist] = useState<Checklist | null>(null);
 const [isLoading, setIsLoading] = useState(true);
 const [isCompactMode, setIsCompactMode] = useState(false);
 const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
 const [objectiveExpanded, setObjectiveExpanded] = useState(false);
 const [isLetterEditing, setIsLetterEditing] = useState(false);
 const letterSaveRef = useRef<(() => void) | null>(null);
 const letterPageRef = useRef<LetterSectionPageHandle>(null);
 const [customLetterExists, setCustomLetterExists] = useState(false);
 const [customLetterIsEditing, setCustomLetterIsEditing] = useState(false);
 const [isFSEditing, setIsFSEditing] = useState(false);
 const fsSaveRef = useRef<(() => void) | null>(null);
 const [isFSSettingsOpen, setIsFSSettingsOpen] = useState(false);
 const [isLayoutOpen, setIsLayoutOpen] = useState(false);
 const [isFSCommentsOpen, setIsFSCommentsOpen] = useState(false);
 const [isVersionsOpen, setIsVersionsOpen] = useState(false);
 const [showAssignDialog, setShowAssignDialog] = useState(false);
 const [priorYearFile, setPriorYearFile] = useState<File | null>(null);
 const [isDraggingOverPriorYear, setIsDraggingOverPriorYear] = useState(false);
 const priorYearFileInputRef = useRef<HTMLInputElement>(null);
 const initialChecklistRef = useRef<Checklist | null>(null);
 const preBulkAnswerRef = useRef<Checklist | null>(null);
 const [priorYearState, setPriorYearState] = useState<'idle' | 'processing' | 'summary' | 'populating' | 'done'>('idle');
 const [showShareDialog, setShowShareDialog] = useState(false);
 const [showResponseDialog, setShowResponseDialog] = useState(false);
 const [pendingEngagementId, setPendingEngagementId] = useState<string | null>(null);
 const [showSwitchDialog, setShowSwitchDialog] = useState(false);
 const [pendingClient, setPendingClient] = useState<string | null>(null);
 const [showClientSwitchDialog, setShowClientSwitchDialog] = useState(false);
 const [selectedClientEngagement, setSelectedClientEngagement] = useState<string | null>(null);
 const [showDeleteDialog, setShowDeleteDialog] = useState(false);
 const isDemoEngagement = engagementId === 'AUD-NPM-Dec312025';
 const [showAddChecklistSheet, setShowAddChecklistSheet] = useState(false);
 const [showRequestPanel, setShowRequestPanel] = useState(false);
 const [requestPanelFullscreen, setRequestPanelFullscreen] = useState(false);
 const [clipboardResponses, setClipboardResponses] = useState<{ checklistTitle: string; responses: Record<string, { answer: string; explanation?: string }> } | null>(null);
 const [showClipboardPrompt, setShowClipboardPrompt] = useState(false);
 const [lukaOpen, setLukaOpen] = useState(false);
 const [notePanel, setNotePanel] = useState<{ noteId: string; noteName: string } | null>(null);
 const [lukaInitialTab, setLukaInitialTab] = useState<"threads" | "workspace">("threads");
 const [lukaInitialWorkspaceEngagement, setLukaInitialWorkspaceEngagement] = useState<{ name: string; code: string; source?: "quickbooks" | "xero" } | undefined>(undefined);
 const [lukaEngagementOverviewMode, setLukaEngagementOverviewMode] = useState(false);
 const [hasUsedLuka, setHasUsedLuka] = useState(() =>
 !!localStorage.getItem(`luka-used-${engagementId}`)
 );
 const [lukaQuery, setLukaQuery] = useState("");
 const [lukaInitialAiMessage, setLukaInitialAiMessage] = useState("");
 const [lukaInitialAiMessagePrompts, setLukaInitialAiMessagePrompts] = useState<string[]>([]);
 const [lukaAutoFillConfig, setLukaAutoFillConfig] = useState<{ label: string; sources: string[]; engagementLabel: string } | null>(null);
 const [lukaPap501Config, setLukaPap501Config] = useState<{ engLabel: string; sources: string[]; isRegenerate?: boolean } | null>(null);
 const [pap501Accepted, setPap501Accepted] = useState(() =>
 !!localStorage.getItem(`pap501-accepted-${engagementId}-ca`) || !!localStorage.getItem(`pap501-accepted-${engagementId}-us`)
 );
 const [isAutoFilling, setIsAutoFilling] = useState(false);
 const [liveApplyingId, setLiveApplyingId] = useState<string | null>(null);
 const [lukaFillSummary, setLukaFillSummary] = useState<{
 filledCount: number;
 totalCount: number;
 skippedItems: Array<{ sectionTitle: string; questionText: string }>;
 } | null>(null);
 const [lukaAllTemplateSummary, setLukaAllTemplateSummary] = useState<{
 templates: Array<{ name: string; filledCount: number; totalCount: number }>;
 totalFilled: number;
 totalFields: number;
 engagementLabel?: string;
 } | null>(null);
 const [lukaAutoFillProgress, setLukaAutoFillProgress] = useState<AutoFillProgressItem[] | null>(null);
 const [pbcNotificationCount, setPBCNotificationCount] = useState(() =>
 engagementId ? getPBCNotificationCount(engagementId) : 0
 );
 // ── Time tracker ─────────────────────────────────────────────────────────────
 const [ttEnabled, setTtEnabled] = useState(getEnabled);
 const [activeSec, setActiveSec] = useState(0);
 const [idleSec, setIdleSec] = useState(0);
 const [isIdle, setIsIdle] = useState(false);
 const activeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
 const idleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
 const lastActivityRef = useRef<number>(Date.now());
 const isIdleRef = useRef(false);
 const activeSecRef = useRef(0);
 const idleSecRef = useRef(0);
 const [isPaused, setIsPaused] = useState(false);
 const isPausedRef = useRef(false);
 const [budgetHrs, setBudgetHrs] = useState(0);
 const [budgetBySection, setBudgetBySection] = useState<Record<string, number>>({});
 const { entries } = useTimeEntries(engagementId ?? "default");

 useEffect(() => {
 if (!priorYearFile) return;
 setPriorYearState('processing');
 const timer = setTimeout(() => setPriorYearState('summary'), 3000);
 return () => clearTimeout(timer);
 }, [priorYearFile]);

 useEffect(() => {
 const handler = () => {
 if (engagementId && checklistKey && !checklistKey.startsWith('notes-') && !checklistKey.startsWith('custom-')) {
 navigate(`/engagements/${engagementId}/checklist/notes-${checklistKey}`);
 }
 };
 window.addEventListener('navigate-to-notes', handler);
 return () => window.removeEventListener('navigate-to-notes', handler);
 }, [engagementId, checklistKey, navigate]);

 useEffect(() => {
 const handler = (e: Event) => {
 const detail = (e as CustomEvent).detail as { engagementId: string };
 if (detail.engagementId === engagementId) {
 setPBCNotificationCount(getPBCNotificationCount(engagementId!));
 }
 };
 window.addEventListener('pbc-notification-update', handler);
 return () => window.removeEventListener('pbc-notification-update', handler);
 }, [engagementId]);

 useEffect(() => {
 const handler = (e: Event) => {
 const ce = e as CustomEvent<{ engagementId: string; isUS: boolean; label: string; sources: string[]; isRegenerate?: boolean }>;
 if (ce.detail?.engagementId !== engagementId) return;
 const client = engagementId ? engagementsData[engagementId]?.client : undefined;
 const engLabel = [client, engagementId].filter(Boolean).join(' · ');
 setLukaPap501Config({ engLabel, sources: ce.detail.sources, isRegenerate: ce.detail.isRegenerate });
 setStoreLukaOpen(false);
 setLukaOpen(true);
 };
 window.addEventListener('pap501-generate', handler);
 return () => window.removeEventListener('pap501-generate', handler);
 }, [engagementId]);

 useEffect(() => {
 const handler = (e: Event) => {
 const { noteId, noteName, engId } = (e as CustomEvent).detail as { noteId: string; noteName: string; engId: string };
 if (engId === engagementId) setNotePanel({ noteId, noteName });
 };
 window.addEventListener('open-note-panel', handler);
 return () => window.removeEventListener('open-note-panel', handler);
 }, [engagementId]);

 function handlePauseResume() {
 if (isPausedRef.current) {
  isPausedRef.current = false;
  setIsPaused(false);
  isIdleRef.current = false;
  setIsIdle(false);
  lastActivityRef.current = Date.now();
  activeTimerRef.current = setInterval(() => {
   activeSecRef.current += 1;
   setActiveSec(activeSecRef.current);
   if (engagementId) updateEngagementTime(engagementId, activeSecRef.current, idleSecRef.current, false);
  }, 1000);
 } else {
  isPausedRef.current = true;
  setIsPaused(true);
  if (activeTimerRef.current) { clearInterval(activeTimerRef.current); activeTimerRef.current = null; }
  if (idleTimerRef.current) { clearInterval(idleTimerRef.current); idleTimerRef.current = null; }
  isIdleRef.current = false;
  setIsIdle(false);
 }
 }

 useEffect(() => subscribeEnabled(setTtEnabled), []);

 // Auto-start time tracking when engagement mounts (only when enabled in Settings)
 useEffect(() => {
 if (!getEnabled()) return;
 const delay = setTimeout(() => {
 isIdleRef.current = false;
 setIsIdle(false);
 activeSecRef.current = 0;
 idleSecRef.current = 0;
 if (engagementId) registerEngagement(engagementId, clientName);
 activeTimerRef.current = setInterval(() => {
 activeSecRef.current += 1;
 setActiveSec(activeSecRef.current);
 if (engagementId) updateEngagementTime(engagementId, activeSecRef.current, idleSecRef.current, false);
 }, 1000);
 toast.success(`Time tracking started for engagement ${engagementId ?? ''}`);
 }, 600);
 return () => {
 clearTimeout(delay);
 if (activeTimerRef.current) clearInterval(activeTimerRef.current);
 if (idleTimerRef.current) clearInterval(idleTimerRef.current);
 if (engagementId) unregisterEngagement(engagementId, activeSecRef.current, idleSecRef.current);
 };
 }, []); // eslint-disable-line react-hooks/exhaustive-deps

 // Idle detection — after 15 min of inactivity, switch active → idle
 useEffect(() => {
 if (!getEnabled()) return;
 const IDLE_MS = 15 * 60 * 1000;
 const checkIdle = setInterval(() => {
 if (Date.now() - lastActivityRef.current >= IDLE_MS && !isIdleRef.current) {
 isIdleRef.current = true;
 setIsIdle(true);
 if (activeTimerRef.current) { clearInterval(activeTimerRef.current); activeTimerRef.current = null; }
 idleTimerRef.current = setInterval(() => {
 idleSecRef.current += 1;
 setIdleSec(idleSecRef.current);
 if (engagementId) updateEngagementTime(engagementId, activeSecRef.current, idleSecRef.current, true);
 }, 1000);
 }
 }, 1000);
 const resetActivity = () => {
 if (isPausedRef.current) return;
 lastActivityRef.current = Date.now();
 if (isIdleRef.current) {
 isIdleRef.current = false;
 setIsIdle(false);
 if (idleTimerRef.current) { clearInterval(idleTimerRef.current); idleTimerRef.current = null; }
 activeTimerRef.current = setInterval(() => {
 activeSecRef.current += 1;
 setActiveSec(activeSecRef.current);
 if (engagementId) updateEngagementTime(engagementId, activeSecRef.current, idleSecRef.current, false);
 }, 1000);
 }
 };
 window.addEventListener('mousemove', resetActivity);
 window.addEventListener('keydown', resetActivity);
 return () => {
 clearInterval(checkIdle);
 window.removeEventListener('mousemove', resetActivity);
 window.removeEventListener('keydown', resetActivity);
 };
 }, []); // eslint-disable-line react-hooks/exhaustive-deps

 // Load budget data from localStorage for budget pill
 useEffect(() => {
 if (!engagementId) return;
 const stored = localStorage.getItem(`audit-time-budget-${engagementId}`);
 if (!stored) return;
 try {
 const data = JSON.parse(stored) as { totalHrs?: string; bySection?: Record<string, string> };
 setBudgetHrs(parseFloat(data.totalHrs ?? '') || 0);
 if (data.bySection) {
 const secs: Record<string, number> = {};
 for (const [k, v] of Object.entries(data.bySection)) secs[k] = parseFloat(v) || 0;
 setBudgetBySection(secs);
 }
 } catch { /* ignore */ }
 }, [engagementId]);

 const totalActualHrs = useMemo(() => entries.reduce((s, e) => s + e.hours, 0), [entries]);
 const actualsBySection = useMemo(() => {
 const m: Record<string, number> = {};
 for (const e of entries) m[e.tbSection] = (m[e.tbSection] ?? 0) + e.hours;
 return m;
 }, [entries]);

 // ────────────────────────────────────────────────────────────────────────────

 const autoFillRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const [lukaFillStatusVersion, setLukaFillStatusVersion] = useState(0);
 useEffect(() => {
 const bump = () => setLukaFillStatusVersion(v => v + 1);
 window.addEventListener('luka-fill-status-updated', bump);
 return () => window.removeEventListener('luka-fill-status-updated', bump);
 }, []);

 // Connectors modal
 const [connectorsOpen, setConnectorsOpen] = useState(false);
 const [scrollToConnectorId, setScrollToConnectorId] = useState<string | undefined>(undefined);
 const [connectedApps, setConnectedApps] = useState<Set<string>>(() => {
 const stored = localStorage.getItem(`connectors-${engagementId}`);
 if (stored) {
 try { return new Set(JSON.parse(stored) as string[]); } catch { /* fall through */ }
 }
 return new Set(["xero"]);
 });
 useEffect(() => {
 if (!engagementId) return;
 localStorage.setItem(`connectors-${engagementId}`, JSON.stringify(Array.from(connectedApps)));
 }, [connectedApps, engagementId]);
 const handleConnectorConnect = useCallback((id: string) => {
 setConnectedApps(prev => new Set([...prev, id]));
 }, []);
 const handleConnectorDisconnect = useCallback((id: string) => {
 setConnectedApps(prev => { const n = new Set(prev); n.delete(id); return n; });
 }, []);

 // Client responses hook
 const checklistAssignments = useChecklistAssignments(engagementId ?? '', checklist?.id ?? checklistKey ?? '');
 const clientResponses = useClientResponses(checklist, checklistAssignments.assignments);
 const engagement = engagementId ? engagementsData[engagementId] : null;
 const displayId = engagementId || "Unknown";
 const clientName = engagement?.client || "Unknown Client";
 const status = engagement?.status || "In Progress";

 // Get unique clients and current client's engagements
 const uniqueClients = useMemo(() => getUniqueClients(), []);
 const clientEngagements = useMemo(() => getEngagementsForClient(clientName), [clientName]);
 const currentChecklistId = checklistKey ? NAV_KEY_TO_CHECKLIST_ID[checklistKey] : undefined;

 // Compute banner fill status + counts
 const { bannerFillStatus, bannerFilledCount, bannerTotalCount } = useMemo(() => {
 void lukaFillStatusVersion; // reactive to fill status changes
 if (!checklistKey || !engagementId) return { bannerFillStatus: 'idle' as const, bannerFilledCount: undefined, bannerTotalCount: undefined };
 if (lukaFillSummary) return { bannerFillStatus: 'completed' as const, bannerFilledCount: lukaFillSummary.filledCount, bannerTotalCount: lukaFillSummary.totalCount };
 const info = currentChecklistId ? CHECKLIST_SIDEBAR_INFO[currentChecklistId] : undefined;
 if (info?.section && localStorage.getItem(`luka-fill-status-${engagementId}-${info.section}`)) {
 try {
 const counts = JSON.parse(localStorage.getItem(`luka-fill-counts-${engagementId}-${info.section}`) ?? 'null');
 return { bannerFillStatus: 'completed' as const, bannerFilledCount: counts?.filled as number | undefined, bannerTotalCount: counts?.total as number | undefined };
 } catch { return { bannerFillStatus: 'completed' as const, bannerFilledCount: undefined, bannerTotalCount: undefined }; }
 }
 if (info?.section === 'RA' || info?.section === 'RP') {
 const matKey = engagementId.startsWith('AUD-US-') ? 'audit-materiality-data-us' : 'audit-materiality-data-ca';
 if (!localStorage.getItem(matKey)) return { bannerFillStatus: 'prerequisite-missing' as const, bannerFilledCount: undefined, bannerTotalCount: undefined };
 }
 return { bannerFillStatus: 'idle' as const, bannerFilledCount: undefined, bannerTotalCount: undefined };
 }, [checklistKey, engagementId, currentChecklistId, lukaFillSummary, lukaFillStatusVersion]);

 // Compute next checklist label and navigate callback for post-fill smart nav
 const { nextChecklistLabel, nextChecklistKey } = useMemo(() => {
 if (!checklistKey) return { nextChecklistLabel: undefined, nextChecklistKey: undefined };
 const keys = Object.keys(NAV_KEY_TO_CHECKLIST_ID);
 const idx = keys.indexOf(checklistKey);
 if (idx === -1 || idx >= keys.length - 1) return { nextChecklistLabel: undefined, nextChecklistKey: undefined };
 const nKey = keys[idx + 1];
 const nId = NAV_KEY_TO_CHECKLIST_ID[nKey];
 const nInfo = nId ? CHECKLIST_SIDEBAR_INFO[nId] : undefined;
 return { nextChecklistLabel: nInfo?.label ?? nKey, nextChecklistKey: nKey };
 }, [checklistKey]);

 // Sync custom letter existence state when navigating to/from custom sections
 useEffect(() => {
 if (checklistKey?.startsWith('custom-') && engagementId) {
 const html = readJsonFromLocalStorage<string | null>(`custom-letter-html-${engagementId}-${checklistKey}`, null);
 setCustomLetterExists(html !== null);
 } else {
 setCustomLetterExists(false);
 }
 setCustomLetterIsEditing(false);
 }, [checklistKey, engagementId]);

 // Redirect to first checklist when no key is in URL
 useEffect(() => {
 if (checklistKey || !engagementId) return;
 const type = engagement?.type ?? '';
 let defaultKey = 'co-ca';
 if (type.includes('GAAS/US') || engagementId.startsWith('AUD-US-')) {
 defaultKey = 'aud-us-form-410';
 } else if (type.includes('Audit') || engagementId.startsWith('AUD-')) {
 defaultKey = 'aud-form-410';
 }
 navigate(`/engagements/${engagementId}/checklist/${defaultKey}`, { replace: true });
 }, [engagementId, checklistKey]);

 // Handle client change - show dialog with engagements
 const handleClientChange = (newClient: string) => {
 if (newClient !== clientName) {
 const clientEngs = getEngagementsForClient(newClient);
 setPendingClient(newClient);
 // Pre-select the first engagement
 setSelectedClientEngagement(clientEngs.length > 0 ? clientEngs[0].id : null);
 setShowClientSwitchDialog(true);
 }
 };

 // Get engagements for pending client
 const pendingClientEngagements = useMemo(() => {
 return pendingClient ? getEngagementsForClient(pendingClient) : [];
 }, [pendingClient]);

 // Confirm client switch
 const confirmClientSwitch = () => {
 if (selectedClientEngagement) {
 navigate(`/engagements/${selectedClientEngagement}`);
 }
 setShowClientSwitchDialog(false);
 setPendingClient(null);
 setSelectedClientEngagement(null);
 };

 // Cancel client switch
 const cancelClientSwitch = () => {
 setShowClientSwitchDialog(false);
 setPendingClient(null);
 setSelectedClientEngagement(null);
 };

 // Handle engagement change - show confirmation dialog
 const handleEngagementChange = (newEngagementId: string) => {
 if (newEngagementId !== engagementId) {
 setPendingEngagementId(newEngagementId);
 setShowSwitchDialog(true);
 }
 };

 // Confirm engagement switch
 const confirmEngagementSwitch = () => {
 if (pendingEngagementId) {
 navigate(`/engagements/${pendingEngagementId}`);
 }
 setShowSwitchDialog(false);
 setPendingEngagementId(null);
 };

 // Cancel engagement switch
 const cancelEngagementSwitch = () => {
 setShowSwitchDialog(false);
 setPendingEngagementId(null);
 };

 // Load checklist from localStorage - use first saved checklist or fallback
 useEffect(() => {
 // FS pages, standalone custom worksheets, and notes pages render without a checklist
 if (checklistKey && checklistKey !== 'aud-ra-pap501a' && (FS_PAGE_KEYS.has(checklistKey) || checklistKey in CUSTOM_WORKSHEET_TITLES || checklistKey.startsWith('notes-') || checklistKey.startsWith('node-note-') || checklistKey.startsWith('custom-'))) {
 setIsLoading(false);
 setChecklist(null);
 return;
 }

 // Set loading state when engagement changes
 setIsLoading(true);
 setChecklist(null);
 initialChecklistRef.current = null;
 preBulkAnswerRef.current = null;

 // One-time migration: clear stale sample checklists saved before the
 // global template library was pulled in, so the engagement reflects the
 // new global checklist content.
 const TEMPLATE_LIBRARY_VERSION = 'v16-506-remove-cas-refs-2026-07';
 const seenVersion = localStorage.getItem('savedChecklistsLibraryVersion');
 if (seenVersion !== TEMPLATE_LIBRARY_VERSION) {
 try {
 localStorage.removeItem('savedChecklists');
 } catch {}
 localStorage.setItem('savedChecklistsLibraryVersion', TEMPLATE_LIBRARY_VERSION);
 }

 // Simulate loading delay for better UX feedback
 const loadTimer = setTimeout(() => {
 let savedChecklists = readJsonFromLocalStorage<any[]>('savedChecklists', []);

 // Seed the engagement with the Compilation folder defaults the first
 // time we load (or after a migration cleared the list).
 if (!Array.isArray(savedChecklists) || savedChecklists.length === 0) {
 const seeded = [...buildDefaultCompilationChecklists(),...buildDefaultAuditChecklists(),...buildDefaultUSAuditChecklists()];
 writeJsonToLocalStorage('savedChecklists', seeded);
 savedChecklists = seeded;
 // Notify the sidebar so it picks up the seeded checklists immediately.
 seeded.forEach(item => {
 window.dispatchEvent(new CustomEvent('checklistSaved', { detail: item }));
 });
 } else {
 // Backfill: keep seeded compilation + audit entries current and remove legacy duplicate EL/MR ids.
 const defaults = [...buildDefaultCompilationChecklists(),...buildDefaultAuditChecklists(),...buildDefaultUSAuditChecklists()];
 const defaultById = new Map(defaults.map(item => [item.id, item]));
 const existingIds = new Set(savedChecklists.map((c: any) => c?.id));
 const missing = defaults.filter(d => !existingIds.has(d.id));
 const refreshed = savedChecklists
.filter((c: any) => !LEGACY_COMPILATION_CHECKLIST_IDS.has(c?.id))
.map((c: any) => {
 const def = defaultById.get(c?.id);
 if (!def) return c;
 // If section IDs diverge from the default, the schema changed — always use the fresh default.
 const storedFirstSectionId = c?.data?.sections?.[0]?.id;
 const defaultFirstSectionId = def?.data?.sections?.[0]?.id;
 if (storedFirstSectionId && defaultFirstSectionId && storedFirstSectionId !== defaultFirstSectionId) return def;
 // Preserve entries that have user-filled answers (e.g. Luka autofill)
 const hasAnswers = c?.data?.sections?.some((s: any) =>
 s?.questions?.some((q: any) => q?.answer && q.answer !== '')
 );
 return hasAnswers ? c : def;
});
 if (missing.length > 0 || refreshed.length !== savedChecklists.length || refreshed.some((item: any, idx: number) => item !== savedChecklists[idx])) {
 savedChecklists = [...refreshed,...missing];
 writeJsonToLocalStorage('savedChecklists', savedChecklists);
 missing.forEach(item => {
 window.dispatchEvent(new CustomEvent('checklistSaved', { detail: item }));
 });
 }
 }

 if (Array.isArray(savedChecklists) && savedChecklists.length > 0) {
 // Pick the requested checklist via route param, else fall back to first.
 const targetId = checklistKey ? NAV_KEY_TO_CHECKLIST_ID[checklistKey] : undefined;
 const requested = targetId
 ? savedChecklists.find((c: any) => c?.id === targetId)
 : undefined;
 const chosen = requested ?? savedChecklists[0];
 if (chosen?.data) {
 let checklistData = chosen.data;
 if (checklistKey === 'aud-form-410' || checklistKey === 'aud-us-form-410') {
 const meta = getEngagementMeta(engagementId ?? '');
 checklistData = adaptForm410ForEngagement(checklistData, meta.firstYearAudit ?? false);
 }
 setChecklist(checklistData);
 if (!initialChecklistRef.current) initialChecklistRef.current = checklistData;
 setIsLoading(false);
 return;
 }
 }

 // Fallback to the new global-template-backed checklist
 setChecklist(fallbackChecklist);
 if (!initialChecklistRef.current) initialChecklistRef.current = fallbackChecklist;
 setIsLoading(false);
 }, 500);
 return () => clearTimeout(loadTimer);
 }, [engagementId, checklistKey]);

 // Listen for real-time sync events from templates page (same tab)
 useEffect(() => {
 const unsubscribe = subscribeToChecklistSync(payload => {
 // Update checklist when sync event is received
 if (payload.data) {
 setChecklist(payload.data);
 }
 });
 return unsubscribe;
 }, []);

 // Listen for storage changes (cross-tab sync)
 useEffect(() => {
 const handleStorageChange = (e: StorageEvent) => {
 if (e.key === 'savedChecklists') {
 const savedChecklists = readJsonFromLocalStorage<any[]>('savedChecklists', []);
 if (Array.isArray(savedChecklists) && savedChecklists.length > 0) {
 const firstChecklist = savedChecklists[0];
 if (firstChecklist?.data) {
 setChecklist(firstChecklist.data);
 }
 }
 }
 };
 window.addEventListener('storage', handleStorageChange);
 return () => window.removeEventListener('storage', handleStorageChange);
 }, []);
 const handleChecklistUpdate = (updatedChecklist: Checklist) => {
 setChecklist(updatedChecklist);
 // In preview mode, we also save changes back to localStorage and dispatch sync
 const savedChecklists = readJsonFromLocalStorage<any[]>('savedChecklists', []);
 if (Array.isArray(savedChecklists) && savedChecklists.length > 0) {
 const checklistId = currentChecklistId ?? savedChecklists[0]?.id;
 const updated = savedChecklists.map((c: any, index: number) => (c?.id === checklistId || (!currentChecklistId && index === 0)) ? {
...c,
 data: updatedChecklist
 } : c);
 writeJsonToLocalStorage('savedChecklists', updated);
 // Dispatch sync event for real-time updates
 if (checklistId) {
 dispatchChecklistSync(checklistId, updatedChecklist);
 }
 }
 };
 const getMockAnswer = (q: Question, idx: number): string => {
 switch (q.answerType) {
 case 'yes-no': return idx % 4 === 2 ? 'No' : 'Yes';
 case 'yes-no-na': return idx % 5 === 2 ? 'N/A' : (idx % 7 === 0 ? 'No' : 'Yes');
 case 'date': return ['2024-03-31', '2024-04-01', '2023-12-31'][idx % 3];
 case 'amount': return ['125,000', '48,500', '2,250,000', '875,000'][idx % 4];
 case 'answer': return ['Reviewed and confirmed with client.', 'Obtained from client documentation.', 'Verified against prior year file.', 'No exceptions noted.'][idx % 4];
 case 'multiple-choice': return q.options?.[idx % (q.options.length || 1)] ?? 'Option A';
 case 'dropdown': return q.options?.[0] ?? 'Standard';
 case 'toggle': return 'true';
 case 'reference': return ['WP-A1', 'WP-B2', 'WP-C3'][idx % 3];
 default: return 'Confirmed';
 }
 };

 const startAutoFill = (
 target: Checklist,
 afterDone?: (result: { filledCount: number; totalCount: number; skippedItems: Array<{ sectionTitle: string; questionText: string }> }) => void
 ) => {
 if (!target || isAutoFilling) return;

 type FlatQ = { sIdx: number; qIdx: number; q: Question; sectionTitle: string };
 const allQ: FlatQ[] = [];
 target.sections.forEach((s, si) => {
 s.questions.forEach((q, qi) => {
 if (q.answerType !== 'none') allQ.push({ sIdx: si, qIdx: qi, q, sectionTitle: s.title });
 });
 });

 if (allQ.length === 0) {
 if (afterDone) {
 afterDone({ filledCount: 0, totalCount: 0, skippedItems: [] });
 } else {
 toast('Nothing to fill in this checklist', { duration: 2000 });
 }
 return;
 }

 // Clear all answers first
 const cleared: Checklist = {
...target,
 sections: target.sections.map(s => ({
...s,
 questions: s.questions.map(q => ({...q, answer: '' })),
 })),
 };
 setChecklist(cleared);
 setIsAutoFilling(true);

 // Split: long-answer/follow-up/file-upload + every 5th eligible = needs human (~20%)
 const toFill: (FlatQ & { answer: string })[] = [];
 const skipped: FlatQ[] = [];
 let eligibleIdx = 0;

 allQ.forEach(({ sIdx, qIdx, q, sectionTitle }) => {
 const needsJudgment =
 q.answerType === 'long-answer' ||
 q.answerType === 'follow-up' ||
 q.answerType === 'file-upload';

 if (needsJudgment || eligibleIdx % 5 === 4) {
 skipped.push({ sIdx, qIdx, q, sectionTitle });
 } else {
 toFill.push({ sIdx, qIdx, q, sectionTitle, answer: getMockAnswer(q, eligibleIdx) });
 }
 eligibleIdx++;
 });

 let current: Checklist = {
...cleared,
 sections: cleared.sections.map(s => ({...s, questions: [...s.questions] })),
 };
 let i = 0;

 const fillNext = () => {
 if (i >= toFill.length) {
 handleChecklistUpdate(current);
 setLiveApplyingId(null);
 setIsAutoFilling(false);
 const result = {
 filledCount: toFill.length,
 totalCount: allQ.length,
 skippedItems: skipped.map(({ q, sectionTitle }) => ({
 sectionTitle,
 questionText: q.text.replace(/<[^>]+>/g, '').trim().slice(0, 90),
 })),
 };
 if (afterDone) {
 afterDone(result);
 } else {
 setLukaFillSummary(result);
 setLukaAutoFillConfig(null);
 setStoreLukaOpen(false);
 setLukaOpen(true);
 }
 return;
 }

 const { sIdx, qIdx, answer, q } = toFill[i];
 setLiveApplyingId(q.id);
 current = {
...current,
 sections: current.sections.map((s, si) =>
 si !== sIdx ? s : {
...s,
 questions: s.questions.map((qq, qi) =>
 qi !== qIdx ? qq : {...qq, answer }
 ),
 }
 ),
 };
 setChecklist({...current });
 const filledId = q.id;
 i++;
 window.requestAnimationFrame(() => {
 document.querySelector(`[data-question-id="${filledId}"]`)
 ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
 });
 autoFillRef.current = setTimeout(fillNext, 380);
 };

 toast('Luka is auto-filling your checklist…', { duration: 4000 });
 autoFillRef.current = setTimeout(fillNext, 600);
 };

 const autofill501BChecklist = () => {
 const PAP501B_ID = 'default-audit-ra-pap501a';
 const saved = readJsonFromLocalStorage<any[]>('savedChecklists', []);
 const entry = saved.find((c: any) => c?.id === PAP501B_ID);
 if (!entry?.data) return;

 const ANSWERS: Record<string, { answer: string; explanation: string }> = {
 'pap501a-1': {
 answer: 'Yes',
 explanation: 'Financial results and trial balance obtained via connected accounting system. Source data quality confirmed as part of engagement acceptance (CO → 410 New/Existing Engagement — Acceptance/Continuance).',
 },
 'pap501a-2': {
 answer: 'Yes',
 explanation: 'Information confirmed as reliable and adequate for performing analytical procedures. Trial balance reconciles to source data reviewed during engagement setup (CO → 410).',
 },
 'pap501a-3a': {
 answer: 'No',
 explanation: 'No significant inconsistencies identified with our understanding of the entity. Business operations align with findings documented in RA → 510 Entity Understanding and CO → 505 Mgmt Inquiries.',
 },
 'pap501a-3b': {
 answer: 'No',
 explanation: 'Preliminary analytical review (501-A, Part B ratios) indicates no abnormal trends or unusual relationships. Revenue and cost relationships are consistent with prior period comparatives reviewed in 501-A Part C.',
 },
 'pap501a-3c': {
 answer: 'No',
 explanation: 'No indicators of potential fraud identified during preliminary analytical procedures. Fraud risk considerations are addressed further in RA → 506 Fraud.',
 },
 'pap501a-4a': {
 answer: 'Yes',
 explanation: 'Management inquired per RA → 505 Mgmt Inquiries. Explanations provided for minor fluctuations were reasonable and consistent with known business conditions and economic environment.',
 },
 'pap501a-4b': {
 answer: 'No',
 explanation: 'No unusual transactions or events identified per management inquiries (RA → 505) and review of prior period comparatives in 501-A Part C.',
 },
 'pap501a-5a': {
 answer: 'No',
 explanation: 'Management explanations were reasonable and corroborated by analytical results in 501-A. No unusual transactions or misstatements identified requiring a specific audit response beyond planned procedures (RP → 605 Risk Responses).',
 },
 'pap501a-5b': {
 answer: 'No',
 explanation: 'No fraud indicators identified from management inquiries (RA → 505) or preliminary analytical procedures (501-A). Addressed further in RA → 506 Fraud and RA → 530 Pervasive Risks.',
 },
 };

 const filled = {
 ...entry.data,
 sections: entry.data.sections.map((s: any) => ({
 ...s,
 questions: s.questions.map((q: any) => {
 const mapped = ANSWERS[q.id];
 return mapped ? { ...q, answer: mapped.answer, explanation: mapped.explanation } : q;
 }),
 })),
 updatedAt: new Date(),
 };

 const updated = saved.map((c: any) => c?.id === PAP501B_ID ? { ...c, data: filled } : c);
 writeJsonToLocalStorage('savedChecklists', updated);
 window.dispatchEvent(new CustomEvent('checklistSaved', { detail: { id: PAP501B_ID, data: filled } }));
 };

 const handleAutoFillConfirmed = () => {
 if (checklist) startAutoFill(checklist);
 };

 const handleAutoFillFromThread = () => {
 if (!checklist) return;
 setLukaOpen(false);
 startAutoFill(checklist, (result) => {
 const title = checklist.title;
 const skipped = result.skippedItems;
 const lines: string[] = [
 `Auto-fill complete for ${title}.`,
 ``,
 `${result.filledCount} of ${result.totalCount} fields were populated from your Xero data.`,
 ];
 if (skipped.length > 0) {
 lines.push(``, `${skipped.length} field${skipped.length === 1 ? '' : 's'} need your attention:`);
 skipped.slice(0, 3).forEach(item => {
 const q = item.questionText;
 lines.push(`• ${q.length > 72 ? q.slice(0, 72) + '...' : q}`);
 });
 if (skipped.length > 3) lines.push(`• …and ${skipped.length - 3} more`);
 } else {
 lines.push(``, `All eligible fields have been filled successfully.`);
 }
 setLukaInitialAiMessage(lines.join('\n'));
 setLukaInitialAiMessagePrompts(
 skipped.length > 0
 ? ["/Jump to first flagged field", "/Review all changes", "/Sign off this section"]
 : ["/Review changes", "/Sign off this section", "/Go to next workpaper"]
 );
 setLukaInitialTab("threads");
 setStoreLukaOpen(false);
 setLukaOpen(true);
 });
 };

 const handleAutoFillAll = () => {
 if (isAutoFilling) return;
 setLukaEngagementOverviewMode(false);
 setLukaOpen(false);

 // Initialize section progress
 const PROGRESS_SECTIONS: AutoFillProgressItem[] = [
 { code: 'CO', label: 'Client Onboarding', status: 'pending' },
 { code: 'PL', label: 'Planning', status: 'pending' },
 { code: 'RA', label: 'Risk Assessment', status: 'pending' },
 { code: 'RP', label: 'Response to Risk', status: 'pending' },
 { code: 'SO', label: 'Completion & Signoffs', status: 'pending' },
 ];
 const firstSidebarSection = (currentChecklistId ? CHECKLIST_SIDEBAR_INFO[currentChecklistId] : undefined)?.section;
 const initProgress = PROGRESS_SECTIONS.map(s => ({
...s,
 status: (s.code === firstSidebarSection ? 'running' : 'pending') as AutoFillProgressItem['status'],
 }));
 setLukaAutoFillProgress(initProgress);
 setStoreLukaOpen(false);
 setLukaAutoFillConfig({ label: checklist?.title ?? 'Engagement Fill', sources: ['Xero connection', 'Predecessor file'], engagementLabel: [engagement?.client, engagementId].filter(Boolean).join(' · ') });
 setLukaOpen(true);

 const firstSidebar = currentChecklistId ? CHECKLIST_SIDEBAR_INFO[currentChecklistId] : undefined;
 const firstTitle = firstSidebar?.label ?? checklist?.title ?? '';
 const firstSection = firstSidebar?.section;
 const firstCode = firstSidebar?.code;
 const engLabel = [engagement?.client, engagementId].filter(Boolean).join(' · ');

 const allResults: Array<{ name: string; code?: string; filledCount: number; totalCount: number; section?: string }> = [];
 const addResult = (name: string, code: string | undefined, filled: number, total: number, section: string | undefined) => {
 if (code) {
 const existing = allResults.find(r => r.section === section && r.code === code);
 if (existing) { existing.filledCount += filled; existing.totalCount += total; return; }
 }
 allResults.push({ name, code, filledCount: filled, totalCount: total, section });
 };

 const writeSectionFillStatus = (sectionCode: string | undefined) => {
 if (sectionCode && engagementId) {
 localStorage.setItem(`luka-fill-status-${engagementId}-${sectionCode}`, '1');
 window.dispatchEvent(new Event('luka-fill-status-updated'));
 }
 };

 const markSectionProgress = (sectionCode: string | undefined, status: AutoFillProgressItem['status'], nextSectionCode?: string) => {
 if (status === 'done') writeSectionFillStatus(sectionCode);
 setLukaAutoFillProgress(prev => {
 if (!prev) return prev;
 return prev.map(s => {
 if (s.code === sectionCode) return {...s, status };
 if (nextSectionCode && s.code === nextSectionCode && status === 'done') return {...s, status: 'running' };
 return s;
 });
 });
 };

 const showAllSummary = (results: typeof allResults) => {
 // Mark all sections as done, persist per-section counts to localStorage
 const SECTION_CODES = ['CO', 'PL', 'RA', 'RP', 'SO'];
 SECTION_CODES.forEach(code => {
 writeSectionFillStatus(code);
 const sectionResults = results.filter(r => r.section === code);
 const filled = sectionResults.reduce((s, r) => s + r.filledCount, 0);
 const total = sectionResults.reduce((s, r) => s + r.totalCount, 0);
 if (engagementId) localStorage.setItem(`luka-fill-counts-${engagementId}-${code}`, JSON.stringify({ filled, total }));
 });
 setLukaAutoFillProgress(prev => prev ? prev.map(s => ({...s, status: 'done' as const })) : prev);
 setLukaAllTemplateSummary({
 templates: results,
 totalFilled: results.reduce((s, t) => s + t.filledCount, 0),
 totalFields: results.reduce((s, t) => s + t.totalCount, 0),
 engagementLabel: engLabel,
 });
 setStoreLukaOpen(false);
 setLukaOpen(true);
 };

 // Determine engagement-type prefix so we only fill relevant templates
 const engPrefix = engagementId?.startsWith('AUD-US-')
 ? 'default-us-audit-'
 : engagementId?.startsWith('AUD-')
 ? 'default-audit-'
 : engagementId?.startsWith('COM-')
 ? 'default-compilation-'
 : engagementId?.startsWith('T2-')
 ? 'default-t2-'
 : null;

 const startRemainingFill = (excludeId: string | undefined, prevSection: string | undefined) => {
 const savedChecklists = readJsonFromLocalStorage<any[]>('savedChecklists', []);
 if (!Array.isArray(savedChecklists)) { showAllSummary(allResults); return; }

 const remaining = savedChecklists.filter((c: any) => {
 if (!c?.data?.sections) return false;
 if (excludeId && c?.id === excludeId) return false;
 if (engPrefix && !String(c?.id ?? '').startsWith(engPrefix)) return false;
 const firstQ = c.data.sections[0]?.questions?.[0];
 return !(firstQ?.answerType === 'none' && !c.data.objective);
 }).slice(0, 60);

 if (remaining.length === 0) { showAllSummary(allResults); return; }

 const firstRemainingSidebar = CHECKLIST_SIDEBAR_INFO[remaining[0]?.id];
 if (firstRemainingSidebar?.section && firstRemainingSidebar.section !== prevSection) {
 markSectionProgress(prevSection, 'done', firstRemainingSidebar.section);
 }

 toast(`Luka filling ${remaining.length} template${remaining.length !== 1 ? 's' : ''}…`, { duration: 3000 });

 let ridx = 0;
 const fillOneRemaining = () => {
 if (ridx >= remaining.length) { showAllSummary(allResults); return; }
 const entry = remaining[ridx];
 const cl: Checklist = entry.data;
 toast(`Auto-filling: ${cl.title}`, { duration: 1000 });
 ridx++;

 type RFlatQ = { sIdx: number; qIdx: number; q: Question };
 const rAllQ: RFlatQ[] = [];
 cl.sections.forEach((s, si) => {
 s.questions.forEach((q, qi) => {
 if (q.answerType !== 'none') rAllQ.push({ sIdx: si, qIdx: qi, q });
 });
 });

 const rToFill: (RFlatQ & { answer: string })[] = [];
 let rIdx = 0;
 rAllQ.forEach(({ sIdx, qIdx, q }) => {
 const skip = q.answerType === 'long-answer' || q.answerType === 'follow-up' || q.answerType === 'file-upload' || rIdx % 5 === 4;
 if (!skip) rToFill.push({ sIdx, qIdx, q, answer: getMockAnswer(q, rIdx) });
 rIdx++;
 });

 const rCleared: Checklist = {...cl, sections: cl.sections.map(s => ({...s, questions: s.questions.map(q => ({...q, answer: '' })) })) };
 let rCurrent = {...rCleared, sections: rCleared.sections.map(s => ({...s, questions: [...s.questions] })) };
 rToFill.forEach(({ sIdx, qIdx, answer }) => {
 rCurrent = {...rCurrent, sections: rCurrent.sections.map((s, si) => si !== sIdx ? s : {...s, questions: s.questions.map((q, qi) => qi !== qIdx ? q : {...q, answer }) }) };
 });

 const latest = readJsonFromLocalStorage<any[]>('savedChecklists', []);
 const rUpdated = latest.map((c: any) => c?.id === entry.id ? {...c, data: rCurrent } : c);
 writeJsonToLocalStorage('savedChecklists', rUpdated);

 const rSidebar = CHECKLIST_SIDEBAR_INFO[entry.id];
 addResult(rSidebar?.label ?? cl.title, rSidebar?.code, rToFill.length, rAllQ.length, rSidebar?.section);
 if (ridx < remaining.length) {
 const nextSidebar = CHECKLIST_SIDEBAR_INFO[remaining[ridx]?.id];
 if (nextSidebar?.section !== rSidebar?.section) {
 markSectionProgress(rSidebar?.section, 'done', nextSidebar?.section);
 }
 }
 setTimeout(fillOneRemaining, 180);
 };

 fillOneRemaining();
 };

 if (checklist) {
 startAutoFill(checklist, (firstResult) => {
 addResult(firstTitle, firstCode, firstResult.filledCount, firstResult.totalCount, firstSection);
 const savedChecklists = readJsonFromLocalStorage<any[]>('savedChecklists', []);
 const checklistId = currentChecklistId ?? (Array.isArray(savedChecklists) ? savedChecklists[0]?.id : undefined);
 startRemainingFill(checklistId, firstSection);
 });
 } else {
 // Custom worksheet page — no current checklist to fill first, go directly to remaining
 toast('Luka is auto-filling your engagement…', { duration: 4000 });
 startRemainingFill(undefined, undefined);
 }
 };

 const handleSave = () => {
 if (checklist) {
 const savedChecklists = readJsonFromLocalStorage<any[]>('savedChecklists', []);
 if (Array.isArray(savedChecklists) && savedChecklists.length > 0) {
 const checklistId = currentChecklistId ?? savedChecklists[0]?.id;
 const updated = savedChecklists.map((c: any, index: number) => (c?.id === checklistId || (!currentChecklistId && index === 0)) ? {
...c,
 data: checklist
 } : c);
 writeJsonToLocalStorage('savedChecklists', updated);
 // Dispatch sync event for real-time updates
 if (checklistId) {
 dispatchChecklistSync(checklistId, checklist);
 }
 }
 toast.success('Checklist saved');
 }
 };

 // Floating action bar handlers
 const allSectionsCollapsed = useMemo(() => {
 if (!checklist) return false;
 return checklist.sections.every(s => !s.isExpanded);
 }, [checklist]);
 const allQuestionsCollapsed = useMemo(() => {
 if (!checklist) return false;
 return checklist.sections.every(s => s.questions.every(q => !q.isExpanded));
 }, [checklist]);
 const handleCollapseSections = () => {
 if (!checklist) return;
 const updated = {
...checklist,
 sections: checklist.sections.map(s => ({
...s,
 isExpanded: false
 }))
 };
 setChecklist(updated);
 };
 const handleExpandSections = () => {
 if (!checklist) return;
 const updated = {
...checklist,
 sections: checklist.sections.map(s => ({
...s,
 isExpanded: true
 }))
 };
 setChecklist(updated);
 };
 const handleCollapseQuestions = () => {
 if (!checklist) return;
 const updated = {
...checklist,
 sections: checklist.sections.map(s => ({
...s,
 questions: s.questions.map(q => ({
...q,
 isExpanded: false
 }))
 }))
 };
 setChecklist(updated);
 };
 const handleExpandQuestions = () => {
 if (!checklist) return;
 const updated = {
...checklist,
 sections: checklist.sections.map(s => ({
...s,
 questions: s.questions.map(q => ({
...q,
 isExpanded: true
 }))
 }))
 };
 setChecklist(updated);
 };
 const handleToggleCompactMode = () => {
 setIsCompactMode(!isCompactMode);
 };
 const handleBulkDelete = () => {
 // No-op in preview mode
 };
 const handleAddCategory = () => {
 // No-op in preview mode
 };

 const handleBulkAnswer = (answer: string, unansweredOnly: boolean) => {
 if (!checklist) return;
 if (!preBulkAnswerRef.current) preBulkAnswerRef.current = checklist;
 const applyToQuestion = (q: Question): Question => {
 const isYesNo = q.answerType === 'yes-no' || q.answerType === 'yes-no-na';
 if (!isYesNo) return q.subQuestions ? { ...q, subQuestions: q.subQuestions.map(applyToQuestion) } : q;
 if (answer === 'NA' && q.answerType === 'yes-no') return q.subQuestions ? { ...q, subQuestions: q.subQuestions.map(applyToQuestion) } : q;
 if (unansweredOnly && q.answer && q.answer.trim()) return q.subQuestions ? { ...q, subQuestions: q.subQuestions.map(applyToQuestion) } : q;
 return { ...q, answer, subQuestions: q.subQuestions ? q.subQuestions.map(applyToQuestion) : q.subQuestions };
 };
 handleChecklistUpdate({
 ...checklist,
 sections: checklist.sections.map(s => ({ ...s, questions: s.questions.map(applyToQuestion) })),
 });
 };

 const handleBulkClear = () => {
 if (!checklist) return;
 if (!preBulkAnswerRef.current) preBulkAnswerRef.current = checklist;
 const clearQuestion = (q: Question): Question => {
 const isYesNo = q.answerType === 'yes-no' || q.answerType === 'yes-no-na';
 const cleared = isYesNo ? { ...q, answer: undefined } : q;
 return cleared.subQuestions ? { ...cleared, subQuestions: cleared.subQuestions.map(clearQuestion) } : cleared;
 };
 handleChecklistUpdate({
 ...checklist,
 sections: checklist.sections.map(s => ({ ...s, questions: s.questions.map(clearQuestion) })),
 });
 };

 const handleBulkRestore = () => {
 if (!preBulkAnswerRef.current) return;
 handleChecklistUpdate(preBulkAnswerRef.current);
 preBulkAnswerRef.current = null;
 };

 const allTopLevelQuestionIds = checklist
 ? checklist.sections.flatMap(s => s.questions.map(q => q.id))
 : [];

 const handleSelectAll = (selectAll: boolean) => {
 if (selectAll) {
 setSelectedQuestions(new Set(allTopLevelQuestionIds));
 } else {
 setSelectedQuestions(new Set());
 }
 };

 const handleRemovePriorYearFile = () => {
 setPriorYearFile(null);
 setPriorYearState('idle');
 };

 const handlePriorYearPopulate = () => {
 if (!checklist) { setPriorYearState('done'); return; }
 setPriorYearState('populating');

 type FlatQ = { sIdx: number; qIdx: number; q: Question };
 const candidates: FlatQ[] = [];
 checklist.sections.forEach((s, si) => {
 s.questions.forEach((q, qi) => {
 if (candidates.length < 8 && ['yes-no', 'yes-no-na', 'amount', 'answer'].includes(q.answerType)) {
 candidates.push({ sIdx: si, qIdx: qi, q });
 }
 });
 });

 if (candidates.length === 0) {
 setPriorYearState('done');
 toast.success('Prior year data imported.', { duration: 2000 });
 return;
 }

 let current: Checklist = {
...checklist,
 sections: checklist.sections.map(s => ({...s, questions: [...s.questions] })),
 };
 let i = 0;

 const fillNext = () => {
 if (i >= candidates.length) {
 setChecklist(current);
 setPriorYearState('done');
 toast.success(`${candidates.length} questions populated from prior year file.`, { duration: 3000 });
 return;
 }
 const { sIdx, qIdx } = candidates[i];
 current = {
...current,
 sections: current.sections.map((s, si) =>
 si !== sIdx ? s : {
...s,
 questions: s.questions.map((q, qi) =>
 qi !== qIdx ? q : {...q, answer: getMockAnswer(q, i), carriedForward: true }
 ),
 }
 ),
 };
 setChecklist({...current });
 i++;
 setTimeout(fillNext, 250);
 };

 setTimeout(fillNext, 400);
 };

 // Delete checklist - save responses to clipboard first
 const handleDeleteChecklist = () => {
 if (!checklist) return;
 // Save current responses to clipboard
 const responses: Record<string, { answer: string; explanation?: string }> = {};
 checklist.sections.forEach(s => {
 const collectAnswers = (questions: Question[]) => {
 questions.forEach(q => {
 if (q.answer) {
 responses[q.id] = { answer: q.answer, explanation: q.explanation };
 }
 if (q.subQuestions) collectAnswers(q.subQuestions);
 });
 };
 collectAnswers(s.questions);
 });
 const hasResponses = Object.keys(responses).length > 0;
 if (hasResponses) {
 setClipboardResponses({ checklistTitle: checklist.title, responses });
 }
 setChecklist(null);
 toast.success('Checklist deleted');
 };

 // Add checklist from picker
 const handleAddChecklist = (saved: { id: string; name: string; data?: any }) => {
 if (saved.data) {
 setChecklist(saved.data);
 setShowAddChecklistSheet(false);
 // Check if clipboard has responses for same checklist title
 if (clipboardResponses && clipboardResponses.checklistTitle === saved.data.title) {
 setShowClipboardPrompt(true);
 }
 }
 };

 // Apply clipboard responses
 const applyClipboardResponses = () => {
 if (!checklist || !clipboardResponses) return;
 const applyToQuestions = (questions: Question[]): Question[] =>
 questions.map(q => {
 const saved = clipboardResponses.responses[q.id];
 return {
...q,
...(saved ? { answer: saved.answer, explanation: saved.explanation } : {}),
 subQuestions: q.subQuestions ? applyToQuestions(q.subQuestions) : q.subQuestions,
 };
 });
 const updated: Checklist = {
...checklist,
 sections: checklist.sections.map(s => ({...s, questions: applyToQuestions(s.questions) })),
 };
 setChecklist(updated);
 setClipboardResponses(null);
 setShowClipboardPrompt(false);
 toast.success('Previous responses restored');
 };

 // Handle share button click - show response dialog if has responses, otherwise show share dialog
 const handleShareButtonClick = () => {
 if (clientResponses.hasResponses) {
 setShowResponseDialog(true);
 } else {
 setShowShareDialog(true);
 }
 };

 const handleAssignConfirm = (scope: 'all' | 'selected', assignee: Assignee) => {
 checklistAssignments.assign(scope, [...selectedQuestions], assignee);
 };

 // Handle share confirmation - trigger client response simulation
 const handleShareConfirm = () => {
 clientResponses.shareWithClient();
 toast.success("Checklist shared with client. Waiting for responses...");
 };

 // Update a specific question's answer and optional explanation using functional state update
 const updateQuestionAnswer = useCallback((questionId: string, answer: string, explanation?: string, answeredBy?: Assignee) => {
 setChecklist(prev => {
 if (!prev) return prev;
 const updateQuestion = (questions: Question[]): Question[] => {
 return questions.map(q => {
 if (q.id === questionId) {
 return {
...q,
 answer,
...(answeredBy !== undefined ? { answeredBy } : {}),
...(explanation ? {
 explanation
 } : {})
 };
 }
 if (q.subQuestions) {
 return {
...q,
 subQuestions: updateQuestion(q.subQuestions)
 };
 }
 return q;
 });
 };
 return {
...prev,
 sections: prev.sections.map(s => ({
...s,
 questions: updateQuestion(s.questions)
 }))
 };
 });
 }, []);

 // Handle accepting selected client responses
 const handleAcceptSelectedResponses = (questionIds: string[]) => {
 const selectedResponses = clientResponses.responses.filter(r =>
 questionIds.includes(r.questionId)
 );
 if (selectedResponses.length === 0) return;

 clientResponses.applyFilteredResponses(
 questionIds,
 (questionId, answer, explanation, answeredBy) => updateQuestionAnswer(questionId, answer, explanation, answeredBy),
 () => {
 toast.success(
 questionIds.length === clientResponses.responses.length
 ? "All client responses have been accepted!"
 : `${questionIds.length} response(s) accepted!`
 );
 }
 );
 };
 // No early return — empty state shown inline when checklist is null
 const engagementBreadcrumb = (
 <div className="flex items-center gap-1 whitespace-nowrap flex-shrink-0 text-sidebar-foreground">
 {/* Client Name (read-only) */}
 <div className="flex items-center gap-1.5 px-2 py-1">
 <div className="w-6 h-6 rounded-md bg-sidebar-foreground/12 border border-sidebar-foreground/15 flex items-center justify-center">
 <Building2 className="h-3.5 w-3.5 text-sidebar-foreground" />
 </div>
 <span className="text-sm font-medium text-sidebar-foreground">{clientName}</span>
 </div>

 <ChevronRight className="h-3.5 w-3.5 text-sidebar-foreground/60" />

 {/* Engagement Selector */}
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <button className="group flex items-center gap-1.5 px-2 py-1 rounded-md border border-sidebar-foreground/20 hover:bg-sidebar-foreground/10 transition-colors">
 <div className="w-6 h-6 rounded-md bg-sidebar-foreground/12 border border-sidebar-foreground/15 flex items-center justify-center">
 <FileText className="h-3.5 w-3.5 text-sidebar-foreground" />
 </div>
 <span className="text-sm font-medium text-sidebar-foreground group-hover:text-sidebar-foreground transition-colors font-mono">{displayId}</span>
 <ChevronDown className="h-3 w-3 text-sidebar-foreground/60 group-hover:text-sidebar-foreground transition-colors" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="start" className="w-auto min-w-[18rem] whitespace-nowrap">
 <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
 Engagements for {clientName}
 </div>
 <DropdownMenuSeparator />
 {clientEngagements.map(eng => <DropdownMenuItem key={eng.id} onClick={() => handleEngagementChange(eng.id)} className="flex items-center gap-3 cursor-pointer group py-2 whitespace-nowrap">
 <div className="flex flex-col flex-1 min-w-0">
 <span className="font-mono text-sm font-medium whitespace-nowrap">{eng.id}</span>
 <div className="flex items-center gap-2 mt-0.5 whitespace-nowrap">
 <Calendar className="h-3 w-3 text-muted-foreground group-hover:text-white transition-colors" />
 <span className="text-xs text-muted-foreground group-hover:text-white transition-colors">{eng.yearEnd}</span>
 <span className="text-xs text-muted-foreground group-hover:text-white transition-colors">•</span>
 <span className="text-xs text-muted-foreground group-hover:text-white transition-colors">{eng.type}</span>
 </div>
 </div>
 {eng.id === displayId && <Check className="h-4 w-4 text-primary group-hover:text-primary-foreground flex-shrink-0" />}
 </DropdownMenuItem>)}
 </DropdownMenuContent>
 </DropdownMenu>

 {/* Status Badge */}
 <Badge variant={status === 'Completed' || status === 'New' ? 'completed' : status === 'Not Started' ? 'notStarted' : 'inProgress'} className="ml-1 whitespace-nowrap">
 {status}
 </Badge>

 {/* Jurisdiction Badge */}
 {engagement?.jurisdiction && (
  <div className="ml-1 inline-flex items-center gap-1 h-7 px-2 bg-muted border border-border rounded-sm">
   <span className="text-[11px] font-semibold text-muted-foreground">
    {engagement.region === "ca" ? "🇨🇦" : "🇺🇸"} {engagement.jurisdiction}
   </span>
  </div>
 )}

 {/* Xero Integration Badge — shown when Xero is connected */}
 {connectedApps.has("xero") && (
 <div className="ml-1 inline-flex items-center justify-center h-7 w-20 px-1 bg-card border border-border rounded-sm gap-1">
 <img src="https://upload.wikimedia.org/wikipedia/en/9/9f/Xero_software_logo.svg" alt="Xero" className="h-4" />
 <span className="text-xs font-medium text-foreground">Xero</span>
 </div>
 )}

 {/* First-time adoption badge */}
 {getEngagementMeta(engagementId ?? '').firstTimeAdoption && (
 <div className="ml-1 inline-flex items-center gap-1 h-7 px-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-sm">
 <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">First-time adoption</span>
 </div>
 )}
 </div>
 );

 return <>
 <Layout title="Engagements" headerContent={engagementBreadcrumb}>
 <div className="flex h-full overflow-hidden">
 {/* Main Content Area */}
 <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
 {/* Top Header Bar with title */}
 <div className="sticky top-0 z-10 border-b border-border bg-gradient-to-r from-card via-card to-secondary/20">
 <div className="flex items-center justify-between px-4 py-1.5">
 <div className="flex items-center gap-2 min-w-0">
 <button
 onClick={togglePanel}
 aria-label={isPanelCollapsed ? "Expand sections panel" : "Collapse sections panel"}
 title={isPanelCollapsed ? "Expand sections panel" : "Collapse sections panel"}
 className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
 >
 <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="16" height="16" className="shrink-0" aria-hidden="true">
   <path fill="currentColor" d="M20.25 7c0-.69-.56-1.25-1.25-1.25H9.75v12.5H19c.69 0 1.25-.56 1.25-1.25zM3.75 17c0 .69.56 1.25 1.25 1.25h3.25V5.75H5c-.69 0-1.25.56-1.25 1.25zm18 0A2.75 2.75 0 0 1 19 19.75H5A2.75 2.75 0 0 1 2.25 17V7A2.75 2.75 0 0 1 5 4.25h14A2.75 2.75 0 0 1 21.75 7z" />
 </svg>
 </button>
 <h1 className="font-semibold text-foreground truncate text-lg">
 {checklist?.title
 || (checklistKey && CUSTOM_WORKSHEET_TITLES[checklistKey])
 || (checklistKey?.startsWith('notes-') && `Notes — ${searchParams.get('t') || CUSTOM_WORKSHEET_TITLES[checklistKey.slice('notes-'.length)] || checklistKey.slice('notes-'.length)}`)
 || (checklistKey?.startsWith('node-note-') && (searchParams.get('t') || checklistKey.slice('node-note-'.length)))
 || (checklistKey?.startsWith('custom-') && (() => { const s = readJsonFromLocalStorage<CustomSection[]>(`engagement-custom-sections-${engagementId}`, []).find(s => s.id === checklistKey); return s?.name; })())
 || (checklistKey && FS_PAGE_KEYS.has(checklistKey) && FS_SCREEN_NAMES[FS_PAGE_TYPE_MAP[checklistKey]])
 || 'Client acceptance and continuance'}
 </h1>
 </div>
 <div className="flex items-center gap-1">
 <div className="relative">
 <ExpandableIconButton
 variant="secondary"
 size="sm"
 icon={<SendHorizontal className="h-4 w-4" />}
 label="Request"
 onClick={() => {
 if (pbcNotificationCount > 0 && engagementId) {
 clearPBCNotifications(engagementId);
 setPBCNotificationCount(0);
 }
 if (engagementId) {
 openLukaWithConfig({ tab: 'threads', flow: 'pbc-request', engagementId });
 setStoreLukaOpen(false);
 setLukaOpen(true);
 }
 }}
 />
 {pbcNotificationCount > 0 && (
 <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center pointer-events-none z-10">
 {pbcNotificationCount}
 </span>
 )}
 </div>
 {/* PBC List button hidden */}
 {inlineHeaderActions.map(action => (
 <ExpandableIconButton
 key={action.id}
 variant="secondary"
 size="sm"
 icon={<action.icon className="h-4 w-4" />}
 label={action.label}
 onClick={
 action.id === "workbook" && engagementId
 ? () =>
 window.open(
 `${import.meta.env.BASE_URL}engagements/${engagementId}/workbook`,
 "_blank",
 "noopener,noreferrer",
 )
 : undefined
 }
 />
 ))}
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <ExpandableIconButton
 variant="secondary"
 size="sm"
 icon={<Settings2 className="h-4 w-4" />}
 label={<span className="inline-flex items-center gap-1">Tools<ChevronDown className="h-3 w-3" /></span>}
 />
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-56">
 <DropdownMenuItem
 className="flex items-center gap-2 cursor-pointer group"
 onClick={() => setConnectorsOpen(true)}
 >
 <PlugZap className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
 <span className="flex-1">Connectors</span>
 {connectedApps.size > 0 && (
 <span className="text-xs text-muted-foreground tabular-nums">{connectedApps.size}</span>
 )}
 </DropdownMenuItem>
 {toolsMenuActions.map(action => (
 <DropdownMenuItem key={action.id} className="flex items-center gap-2 cursor-pointer group">
 <action.icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
 <span>{action.label}</span>
 </DropdownMenuItem>
 ))}
 {connectedApps.size > 0 && (
 <>
 <DropdownMenuSeparator />
 {Array.from(connectedApps).map(appId => {
 const c = CONNECTORS_BY_ID[appId];
 if (!c) return null;
 return (
 <DropdownMenuItem
 key={appId}
 className="flex items-center gap-2 cursor-pointer group"
 onClick={() => { handleConnectorDisconnect(appId); }}
 >
 <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.bg }} />
 <span className="flex-1 text-xs">{c.name}</span>
 <span className="text-[10px] text-green-600 font-medium">Connected</span>
 </DropdownMenuItem>
 );
 })}
 </>
 )}
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 </div>
 {/* Action buttons row */}
 <div className="flex items-center justify-between gap-2 px-4 py-1.5 border-t border-border/50">
 {/* Time tracker pill */}
 {ttEnabled && (
 <div className="flex items-center gap-2 shrink-0">
  <div className={`flex items-center gap-1.5 h-7 px-3 rounded-full border text-xs font-medium whitespace-nowrap font-mono tabular-nums ${isPaused ? 'bg-muted border-border text-muted-foreground' : isIdle ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400' : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'}`}>
   {!isPaused && <span className={`w-1.5 h-1.5 rounded-full shrink-0 animate-pulse ${isIdle ? 'bg-amber-500' : 'bg-red-500'}`} />}
   {(() => {
    const s = isIdle ? idleSec : activeSec;
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}h:${m}m:${sec}s`;
   })()}
   {isPaused && <span className="font-sans font-normal opacity-60 ml-0.5">paused</span>}
   {!isPaused && isIdle && <span className="font-sans font-normal opacity-70 ml-0.5">idle</span>}
  </div>
  <Button
   variant="secondary"
   size="sm"
   onClick={handlePauseResume}
   title={isPaused ? 'Resume timer' : 'Pause timer'}
   className="h-7 w-7 p-0 shrink-0"
  >
   {isPaused ? <Play className="h-3.5 w-3.5 ml-0.5" /> : <Pause className="h-3.5 w-3.5" />}
  </Button>
 </div>
 )}
 <div className="flex items-center gap-1 ml-auto">
 {checklistKey?.startsWith('node-note-') && (
  <>
  <Button variant="secondary" size="sm" className="h-7 px-2.5 text-xs gap-1.5"
   onClick={() => window.dispatchEvent(new CustomEvent('notes-export-pdf'))}>
   <Download className="h-3 w-3" />
   Export PDF
  </Button>
  <div className="w-px h-4 bg-border mx-0.5" />
  </>
 )}
 {checklistKey && engagementId && !FS_PAGE_KEYS.has(checklistKey) && (
 <>
 <Tooltip>
 <TooltipTrigger asChild>
 <button
 onClick={() => {
 if (!hasUsedLuka) {
 setHasUsedLuka(true);
 localStorage.setItem(`luka-used-${engagementId}`, '1');
 }
 setLukaInitialTab("threads");
 setLukaInitialAiMessage(`What would you like to do in the "${checklist?.title ?? CUSTOM_WORKSHEET_TITLES[checklistKey ?? ''] ?? checklistKey}" workpaper? I can help you understand requirements, fill in fields, review responses, or answer questions about this section.`);
 setLukaInitialAiMessagePrompts(["/Explain requirements", "/Auto-fill this section", "/Review my responses", "/What are the risks?"]);
 openLukaWithConfig({ tab: 'threads' });
 setStoreLukaOpen(false);
 setLukaOpen(true);
 }}
 className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[8px] text-xs font-semibold text-white shadow-sm bg-gradient-to-br from-[#8649F1] to-[#2355A4] hover:opacity-90 transition-opacity"
 >
 <MessageSquare className="h-3.5 w-3.5" />
 Thread
 </button>
 </TooltipTrigger>
 <TooltipContent side="bottom"><p>Start a Luka thread for this workpaper</p></TooltipContent>
 </Tooltip>

 <div className="w-px h-4 bg-border mx-0.5" />
 </>
 )}
 {(checklistKey === 'aud-ra-pap501bc' || checklistKey === 'aud-ra-pap501') && pap501Accepted && (
 <>
 <Button variant="secondary" size="sm" className="h-7 px-2.5 text-xs gap-1.5"
 onClick={() => toast('Export coming soon')}>
 <Download className="h-3 w-3" />Export
 </Button>
 <Button variant="secondary" size="sm" className="h-7 px-2.5 text-xs gap-1.5"
 onClick={() => toast('Share coming soon')}>
 <Share2 className="h-3 w-3" />Share
 </Button>
 {!isDemoEngagement && (
 <Button variant="secondary" size="sm" className="h-7 px-2.5 text-xs gap-1.5"
 onClick={() => toast('Delete coming soon')}>
 <Trash2 className="h-3 w-3" />Delete
 </Button>
 )}
 </>
 )}
 {checklistKey && WORKSHEET_KEYS.has(checklistKey) && (
 <DropdownMenu>
   <DropdownMenuTrigger asChild>
     <ExpandableIconButton variant="secondary" size="sm" icon={<Download className="h-4 w-4" />} label="Export" />
   </DropdownMenuTrigger>
   <DropdownMenuContent align="end" className="min-w-max">
     <DropdownMenuItem className="flex items-center gap-2 cursor-pointer group"
       onClick={() => exportWorksheetAsPDF(CUSTOM_WORKSHEET_TITLES[checklistKey] ?? 'Worksheet')}>
       <FileText className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
       <span>Export as PDF</span>
     </DropdownMenuItem>
     <DropdownMenuItem className="flex items-center gap-2 cursor-pointer group"
       onClick={() => exportWorksheetAsWord(CUSTOM_WORKSHEET_TITLES[checklistKey] ?? 'Worksheet')}>
       <FileType className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
       <span>Export as Word</span>
     </DropdownMenuItem>
   </DropdownMenuContent>
 </DropdownMenu>
 )}
 {checklistKey && FS_PAGE_KEYS.has(checklistKey) ? (
 <>
 {isFSEditing ? (
 <>
 <ExpandableIconButton variant="secondary" icon={<X className="h-4 w-4" />} label="Cancel" size="sm" onClick={() => setIsFSEditing(false)} />
 <ExpandableIconButton variant="default" icon={<Check className="h-4 w-4" />} label="Save" size="sm" onClick={() => { fsSaveRef.current?.(); setIsFSEditing(false); }} />
 </>
 ) : (
 <ExpandableIconButton variant="secondary" icon={<Pencil className="h-4 w-4" />} label="Edit" size="sm" onClick={() => setIsFSEditing(true)} />
 )}
 <ExpandableIconButton variant="secondary" icon={<Settings2 className="h-4 w-4" />} label="FS Settings" size="sm" onClick={() => setIsFSSettingsOpen(true)} />
 <ExpandableIconButton variant="secondary" icon={<LayoutGrid className="h-4 w-4" />} label="Layout" size="sm" onClick={() => setIsLayoutOpen(true)} />
 <ExpandableIconButton variant="secondary" icon={<MessageSquare className="h-4 w-4" />} label="Comments" size="sm" onClick={() => setIsFSCommentsOpen(v => !v)} />
 <ExpandableIconButton variant="secondary" icon={<History className="h-4 w-4" />} label="Versions" size="sm" onClick={() => setIsVersionsOpen(v => !v)} />
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <ExpandableIconButton variant="secondary" size="sm" icon={<Download className="h-4 w-4" />} label="Export" />
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-40">
 <DropdownMenuItem className="flex items-center gap-2 cursor-pointer group" onClick={() => window.print()}>
 <FileText className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
 <span>PDF</span>
 </DropdownMenuItem>
 <DropdownMenuItem className="flex items-center gap-2 cursor-pointer group" onClick={() => toast.info('Word export coming soon')}>
 <FileType className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
 <span>Word</span>
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </>
 ) : null}
 {checklistKey?.startsWith('custom-') && (
 customLetterExists ? (
 <>
 {customLetterIsEditing ? (
 <>
 <ExpandableIconButton variant="secondary" icon={<X className="h-4 w-4" />} label="Cancel" size="sm" onClick={() => letterPageRef.current?.cancelEdits()} />
 <ExpandableIconButton variant="default" icon={<Check className="h-4 w-4" />} label="Save" size="sm" onClick={() => letterPageRef.current?.saveEdits()} />
 </>
 ) : (
 <ExpandableIconButton variant="secondary" icon={<Pencil className="h-4 w-4" />} label="Edit" size="sm" onClick={() => letterPageRef.current?.startEditing()} />
 )}
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <ExpandableIconButton variant="secondary" size="sm" icon={<Download className="h-4 w-4" />} label="Export" />
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-40">
 <DropdownMenuItem className="flex items-center gap-2 cursor-pointer group" onClick={() => toast.info('Exporting as PDF...')}>
 <FileText className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
 <span>PDF</span>
 </DropdownMenuItem>
 <DropdownMenuItem className="flex items-center gap-2 cursor-pointer group" onClick={() => toast.info('Exporting as Word...')}>
 <FileType className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
 <span>Word</span>
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 <ExpandableIconButton variant="secondary" size="sm" icon={<Share2 className="h-4 w-4" />} label="Share" onClick={handleShareButtonClick} />
 <ExpandableIconButton
 variant="secondary"
 size="sm"
 icon={<svg className="h-4 w-4" viewBox="0 0 1024 1024" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
 <path d="M620.544 137.6c103.936 10.432 187.328 72.96 205.12 180.224h-60.16l97.088 144.448 97.152-144.448h-67.008c-17.792-144.448-127.168-238.336-265.344-251.712-19.136-1.536-36.864 14.848-36.864 35.712 1.28 17.92 13.568 34.24 30.016 35.776z m-150.4-73.024H132.416c-19.136 0-34.176 16.384-34.176 37.248v321.728c0 20.864 15.04 37.248 34.176 37.248h337.728c19.136 0 34.176-16.384 34.176-37.248V101.824c0-20.864-15.04-37.248-34.176-37.248z m-32.832 324.736H165.248V136.064h272.128v253.248h-0.064zM404.48 883.84c-116.224-10.432-205.12-87.872-209.216-216h64.256L162.496 523.392l-97.088 144.448h64.256c2.688 165.376 118.912 272.576 268.032 287.488 19.136 1.472 36.928-14.912 36.928-35.776a35.648 35.648 0 0 0-30.144-35.712z m489.6-323.264H556.288c-19.2 0-34.176 16.448-34.176 37.248v323.264c0 20.8 14.976 37.184 34.176 37.184h337.728c19.136 0 34.112-16.384 34.112-37.184V597.824c0.064-20.8-16.32-37.248-34.048-37.248z m-32.896 324.736H589.12V633.536h272.064v251.776z" />
 </svg>}
 label="Replace"
 />
 {!isDemoEngagement && (
 <ExpandableIconButton
 variant="secondary"
 size="sm"
 icon={<Trash2 className="h-4 w-4" />}
 label="Delete"
 className="text-destructive hover:text-destructive focus-visible:text-destructive"
 onClick={() => setShowDeleteDialog(true)}
 />
 )}
 </>
 ) : (() => {
 const sec = readJsonFromLocalStorage<CustomSection[]>(`engagement-custom-sections-${engagementId}`, []).find(s => s.id === checklistKey);
 return (
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button size="sm" className="gap-1.5 h-7 px-2.5 text-xs">
 <Plus className="h-3.5 w-3.5" />
 Letter
 <ChevronDown className="h-3.5 w-3.5" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="min-w-max">
 <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-sm whitespace-nowrap" onClick={() => letterPageRef.current?.openUpload()}>
 <span className="flex shrink-0"><Upload className="h-4 w-4" /></span><span>Upload a letter</span>
 </DropdownMenuItem>
 <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-sm whitespace-nowrap" onClick={() => letterPageRef.current?.openTemplatePanel()}>
 <span className="flex shrink-0"><FileText className="h-4 w-4" /></span><span>Create from template</span>
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 );
 })()
 )}
 {checklist && <>
 {(() => {
 const isLetter = checklist?.sections?.length > 0 && checklist.sections[0]?.questions?.length > 0 && checklist.sections[0].questions[0]?.answerType === 'none' && !checklist.objective;
 if (isLetter) {
 return isLetterEditing ? (
 <>
 <ExpandableIconButton variant="secondary" icon={<X className="h-4 w-4" />} label="Cancel" size="sm" onClick={() => setIsLetterEditing(false)} />
 <ExpandableIconButton variant="default" icon={<Check className="h-4 w-4" />} label="Save" size="sm" onClick={() => { letterSaveRef.current?.(); setIsLetterEditing(false); }} />
 </>
 ) : (
 <ExpandableIconButton variant="secondary" icon={<Pencil className="h-4 w-4" />} label="Edit" size="sm" onClick={() => setIsLetterEditing(true)} />
 );
 }
 return (
 <ExpandableIconButton variant="default" icon={<Save className="h-4 w-4" />} label="Save" size="sm" onClick={handleSave} />
 );
 })()}
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <ExpandableIconButton
 variant="secondary"
 size="sm"
 icon={<Download className="h-4 w-4" />}
 label="Export"
 />
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-40">
 <DropdownMenuItem className="flex items-center gap-2 cursor-pointer group" onClick={() => toast.info('Exporting as PDF...')}>
 <FileText className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
 <span>PDF</span>
 </DropdownMenuItem>
 <DropdownMenuItem className="flex items-center gap-2 cursor-pointer group" onClick={() => toast.info('Exporting as Word...')}>
 <FileType className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
 <span>Word</span>
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 <div className="relative">
 <ExpandableIconButton
 variant="secondary"
 size="sm"
 icon={<Share2 className="h-4 w-4" />}
 label={clientResponses.hasResponses ? 'Responses!' : 'Share'}
 className={clientResponses.hasResponses ? 'ring-2 ring-primary ring-offset-2' : undefined}
 onClick={handleShareButtonClick}
 />
 {clientResponses.hasResponses && <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 pointer-events-none">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
 <span className="relative inline-flex rounded-full h-5 w-5 bg-primary items-center justify-center">
 <Bell className="h-3 w-3 text-primary-foreground" />
 </span>
 </span>}
 </div>
 <ExpandableIconButton
 variant="secondary"
 size="sm"
 icon={<svg className="h-4 w-4" viewBox="0 0 1024 1024" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
 <path d="M620.544 137.6c103.936 10.432 187.328 72.96 205.12 180.224h-60.16l97.088 144.448 97.152-144.448h-67.008c-17.792-144.448-127.168-238.336-265.344-251.712-19.136-1.536-36.864 14.848-36.864 35.712 1.28 17.92 13.568 34.24 30.016 35.776z m-150.4-73.024H132.416c-19.136 0-34.176 16.384-34.176 37.248v321.728c0 20.864 15.04 37.248 34.176 37.248h337.728c19.136 0 34.176-16.384 34.176-37.248V101.824c0-20.864-15.04-37.248-34.176-37.248z m-32.832 324.736H165.248V136.064h272.128v253.248h-0.064zM404.48 883.84c-116.224-10.432-205.12-87.872-209.216-216h64.256L162.496 523.392l-97.088 144.448h64.256c2.688 165.376 118.912 272.576 268.032 287.488 19.136 1.472 36.928-14.912 36.928-35.776a35.648 35.648 0 0 0-30.144-35.712z m489.6-323.264H556.288c-19.2 0-34.176 16.448-34.176 37.248v323.264c0 20.8 14.976 37.184 34.176 37.184h337.728c19.136 0 34.112-16.384 34.112-37.184V597.824c0.064-20.8-16.32-37.248-34.048-37.248z m-32.896 324.736H589.12V633.536h272.064v251.776z" />
 </svg>}
 label="Replace"
 />
 {!isDemoEngagement && (
 <ExpandableIconButton
 variant="secondary"
 size="sm"
 icon={<Trash2 className="h-4 w-4" />}
 label="Delete"
 className="text-destructive hover:text-destructive focus-visible:text-destructive"
 onClick={() => setShowDeleteDialog(true)}
 />
 )}
 </>}
 </div>
 </div>
 </div>

 {/* Content Area */}
 <div className="flex-1 overflow-auto bg-card" id={checklistKey && WORKSHEET_KEYS.has(checklistKey) ? 'worksheet-export-content' : undefined}>
 {/* Auto-fill progress indicator */}
 {isAutoFilling && (
 <div className="mx-4 mt-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 flex items-center gap-3">
 <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#8649F1] to-[#2355A4] luka-thinking-spin shrink-0" />
 <span className="text-sm font-medium text-primary">Luka is auto-filling your checklist…</span>
 <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
 <div className="h-full rounded-full bg-gradient-to-r from-[#8649F1] to-[#2355A4] luka-thinking-text" style={{ width: '60%' }} />
 </div>
 </div>
 )}
 {/* ── Prior Year File Upload Section ── */}
 {(() => {
 const meta = getEngagementMeta(engagementId ?? '');
 if (meta.firstYearOnPlatform !== 'no') return null;
 const checklistCode = CHECKLIST_SIDEBAR_INFO[currentChecklistId ?? '']?.code
 ?? CHECKLIST_SIDEBAR_INFO[checklist?.id ?? '']?.code;
 if (checklistCode !== 'AC') return null;

 if (priorYearState === 'done') return (
 <div className="mx-4 mt-4 flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20">
 <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
 <span className="text-sm text-green-700 dark:text-green-400 font-medium flex-1">Prior year data imported — carry-forward indicators applied to questions</span>
 <button onClick={() => { setPriorYearState('idle'); setPriorYearFile(null); }} className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
 <X className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
 </button>
 </div>
 );

 return (
 <div className="mx-4 mt-4 rounded-lg border border-border bg-card overflow-hidden">
 <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
 <div className="flex items-center gap-2">
 <FileText className="h-4 w-4 text-muted-foreground" />
 <span className="text-sm font-semibold text-foreground">Prior Year Audit File</span>
 </div>
 {priorYearState === 'idle' && priorYearFile && (
 <button onClick={handleRemovePriorYearFile} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
 <X className="h-3.5 w-3.5" />
 </button>
 )}
 </div>
 <div className="px-4 py-4">

 {/* IDLE: drop zone */}
 {priorYearState === 'idle' && (
 <>
 <p className="text-xs text-muted-foreground mb-3">
 Upload your prior year audit file (PDF). Luka will extract acceptance data, materiality figures, and risk register items to carry forward as reviewable starting points.
 </p>
 <div
 onClick={() => priorYearFileInputRef.current?.click()}
 onDragOver={(e) => { e.preventDefault(); setIsDraggingOverPriorYear(true); }}
 onDragLeave={() => setIsDraggingOverPriorYear(false)}
 onDrop={(e) => {
 e.preventDefault();
 setIsDraggingOverPriorYear(false);
 const file = e.dataTransfer.files[0];
 if (file?.type === 'application/pdf') setPriorYearFile(file);
 else toast.error('Please upload a PDF file');
 }}
 className={`flex flex-col items-center justify-center gap-2 px-6 py-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
 isDraggingOverPriorYear
 ? 'border-primary bg-primary/5'
 : 'border-border hover:border-primary/40 hover:bg-muted/20'
 }`}
 >
 <UploadCloud className={`h-6 w-6 ${isDraggingOverPriorYear ? 'text-primary' : 'text-muted-foreground'}`} />
 <div className="text-center">
 <p className="text-sm font-medium text-foreground">Drop your prior year PDF here</p>
 <p className="text-xs text-muted-foreground mt-0.5">or <span className="text-primary underline underline-offset-2">click to browse</span> · PDF only</p>
 </div>
 </div>
 <input
 ref={priorYearFileInputRef}
 type="file"
 accept=".pdf,application/pdf"
 className="hidden"
 onChange={(e) => { const f = e.target.files?.[0]; if (f) setPriorYearFile(f); }}
 />
 </>
 )}

 {/* PROCESSING: Luka reading */}
 {priorYearState === 'processing' && (
 <div className="flex flex-col items-center gap-3 py-4">
 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8649F1] to-[#2355A4] luka-thinking-spin shrink-0 flex items-center justify-center">
 <Zap className="h-4 w-4 text-white fill-white" strokeWidth={0} />
 </div>
 <div className="text-center">
 <p className="text-sm font-semibold text-foreground">Luka is reading your prior year file…</p>
 <p className="text-xs text-muted-foreground mt-1">Extracting acceptance data, materiality figures, and risk items</p>
 </div>
 <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
 <div className="h-full rounded-full bg-gradient-to-r from-[#8649F1] to-[#2355A4] luka-thinking-text" style={{ width: '65%' }} />
 </div>
 {priorYearFile && (
 <p className="text-xs text-muted-foreground">{priorYearFile.name} · {(priorYearFile.size / 1024).toFixed(0)} KB</p>
 )}
 </div>
 )}

 {/* SUMMARY: found items + confirm */}
 {priorYearState === 'summary' && (
 <div className="flex flex-col gap-4">
 <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
 <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#8649F1] to-[#2355A4] shrink-0 mt-0.5 flex items-center justify-center">
 <Zap className="h-3 w-3 text-white fill-white" strokeWidth={0} />
 </div>
 <div className="flex-1">
 <p className="text-sm font-semibold text-foreground mb-2">Found in prior year file:</p>
 <ul className="space-y-1.5">
 {([
 { label: 'Client acceptance responses', detail: '8 questions' },
 { label: 'Materiality figures', detail: 'Overall: $185,000 · PM: $129,500' },
 { label: 'Risk register items', detail: '4 identified risks' },
 { label: 'Engagement team structure', detail: '3 members' },
 ] as const).map((item) => (
 <li key={item.label} className="flex items-center gap-2 text-xs">
 <Check className="h-3 w-3 text-primary shrink-0" />
 <span className="font-medium text-foreground">{item.label}</span>
 <span className="text-muted-foreground">— {item.detail}</span>
 </li>
 ))}
 </ul>
 </div>
 </div>
 <p className="text-sm text-muted-foreground">Would you like me to populate the current engagement from these? Each field will be tagged "Carried forward — please confirm or update" so you can review individually.</p>
 <div className="flex items-center gap-2 justify-end">
 <button
 onClick={handleRemovePriorYearFile}
 className="inline-flex items-center h-8 px-3 rounded-[8px] border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
 >
 Not now
 </button>
 <button
 onClick={handlePriorYearPopulate}
 className="inline-flex items-center gap-1.5 h-8 px-4 rounded-[8px] text-sm font-semibold text-white shadow-sm bg-gradient-to-br from-[#8649F1] to-[#2355A4] hover:opacity-90 transition-opacity"
 >
 <Zap className="h-3.5 w-3.5 text-white fill-white" strokeWidth={0} />
 Populate engagement
 </button>
 </div>
 </div>
 )}

 {/* POPULATING: Luka filling */}
 {priorYearState === 'populating' && (
 <div className="flex flex-col items-center gap-3 py-4">
 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8649F1] to-[#2355A4] luka-thinking-spin shrink-0 flex items-center justify-center">
 <Zap className="h-4 w-4 text-white fill-white" strokeWidth={0} />
 </div>
 <div className="text-center">
 <p className="text-sm font-semibold text-foreground">Luka is populating your engagement…</p>
 <p className="text-xs text-muted-foreground mt-1">Adding carry-forward indicators to each field</p>
 </div>
 <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
 <div className="h-full rounded-full bg-gradient-to-r from-[#8649F1] to-[#2355A4] luka-thinking-text" style={{ width: '40%' }} />
 </div>
 </div>
 )}

 </div>
 </div>
 );
 })()}

 {/* ── Financial Statement pages ── */}
 {checklistKey && FS_PAGE_KEYS.has(checklistKey) && engagementId ? (
 <LayoutSettingsProvider>
 <CommentProvider>
 <FSCommentsBridge open={isFSCommentsOpen} currentScreen={FS_SCREEN_NAMES[FS_PAGE_TYPE_MAP[checklistKey]] ?? 'Balance Sheet'} />
 <div className="flex h-full overflow-hidden">
 <FSScrollCanvas onCommentsToggle={setIsFSCommentsOpen}>
 <FSPageViewer
 pageType={FS_PAGE_TYPE_MAP[checklistKey]}
 engagementId={engagementId}
 isUS={checklistKey.startsWith('aud-us-fs-')}
 isCompilation={checklistKey.startsWith('fs-')}
 isEditing={isFSEditing}
 />
 </FSScrollCanvas>
 <CommentsPanel />
 <VersionHistoryPanel
 open={isVersionsOpen}
 onClose={() => setIsVersionsOpen(false)}
 currentScreen={FS_SCREEN_NAMES[FS_PAGE_TYPE_MAP[checklistKey]] ?? 'Balance Sheet'}
 />
 </div>
 <FSSettingsPanel open={isFSSettingsOpen} onClose={() => setIsFSSettingsOpen(false)} />
 <LayoutSettingsPanel open={isLayoutOpen} onClose={() => setIsLayoutOpen(false)} />
 </CommentProvider>
 </LayoutSettingsProvider>
 ) : checklistKey?.startsWith('node-note-') ? (
 <NotesSlidePanel
 pageMode
 open
 onOpenChange={() => {}}
 noteId={checklistKey.slice('node-note-'.length)}
 noteName={searchParams.get('t') || checklistKey.slice('node-note-'.length)}
 engId={engagementId ?? ''}
 />
 ) : checklistKey?.startsWith('notes-') ? (
 <NotesWorksheet
 parentKey={checklistKey.slice('notes-'.length)}
 parentTitle={searchParams.get('t') || CUSTOM_WORKSHEET_TITLES[checklistKey.slice('notes-'.length)] || checklistKey.slice('notes-'.length)}
 />
 ) : checklistKey?.startsWith('custom-') ? (() => {
 const sections = readJsonFromLocalStorage<CustomSection[]>(`engagement-custom-sections-${engagementId}`, []);
 const sec = sections.find(s => s.id === checklistKey);
 return (
 <div className="relative flex flex-col flex-1 min-h-0">
 <LetterSectionPage
 ref={letterPageRef}
 sectionId={checklistKey}
 sectionName={sec?.name ?? 'Letter'}
 engagementId={engagementId ?? ''}
 onLetterExistsChange={setCustomLetterExists}
 onEditingChange={setCustomLetterIsEditing}
 />
 </div>
 );
 })() : (checklistKey === 'aud-mat' || checklistKey === 'aud-us-mat') ? (
 <AuditMaterialityWorksheet isUS={checklistKey === 'aud-us-mat'} engagementId={engagementId} />
 ) : (checklistKey === 'aud-tt' || checklistKey === 'aud-us-tt') ? (
 <AuditTimeTrackerWorksheet />
 ) : (checklistKey === 'aud-iar' || checklistKey === 'aud-us-iar') ? (
 <AuditMgmtRequestsWorksheet isUS={checklistKey === 'aud-us-iar'} />
 ) : (checklistKey === 'aud-form-440' || checklistKey === 'aud-us-form-440') ? (
 <BulkRequestsWorksheet isUS={checklistKey === 'aud-us-form-440'} />
 ) : (checklistKey === 'aud-plan' || checklistKey === 'aud-us-plan') ? (
 <AuditTeamPlanningWorksheet isUS={checklistKey === 'aud-us-plan'} connectedApps={connectedApps} onOpenConnectors={(id) => { setScrollToConnectorId(id); setConnectorsOpen(true); }} />
 ) : (checklistKey === 'aud-scope' || checklistKey === 'aud-us-scope') ? (
 <AuditScopeWorksheet isUS={checklistKey === 'aud-us-scope'} />
 ) : (checklistKey === 'aud-pap' || checklistKey === 'aud-us-pap') ? (
 <AuditPAPWorksheet isUS={checklistKey === 'aud-us-pap'} />
 ) : (checklistKey === 'aud-sae' || checklistKey === 'aud-us-sae') ? (
 <AuditSAEWorksheet isUS={checklistKey === 'aud-us-sae'} />
 ) : (checklistKey === 'aud-asm' || checklistKey === 'aud-us-asm') ? (
 <AuditOASWorksheet isUS={checklistKey === 'aud-us-asm'} />
 ) : (checklistKey === 'aud-ra-pap501bc' || checklistKey === 'aud-ra-pap501') ? (
 <AuditPAP501Worksheet />

 ) : (checklistKey === 'aud-ra-507') ? (
 <Audit507Worksheet connectedApps={connectedApps} onOpenConnectors={() => setConnectorsOpen(true)} />
 ) : (checklistKey === 'aud-ra-510') ? (
 <Audit510Worksheet />
 ) : (checklistKey === 'aud-ra-511') ? (
 <Audit511Worksheet />
 ) : (checklistKey === 'aud-ra-513') ? (
 <Audit513Worksheet />
 ) : (checklistKey === 'aud-ra-515') ? (
 <Audit515Worksheet />

 ) : (checklistKey === 'aud-ra-514') ? (
 <Audit514Worksheet />
 ) : (checklistKey === 'aud-ra-520') ? (
 <Audit520Worksheet />
 ) : (checklistKey === 'aud-ra-540') ? (
 <Audit540Worksheet />
 ) : (checklistKey === 'aud-ra-550') ? (
 <Audit550Worksheet />
 ) : (checklistKey === 'aud-ra-551') ? (
 <Audit551Worksheet />
 ) : (checklistKey === 'aud-ra-535') ? (
 <Audit535Worksheet />
 ) : (checklistKey === 'aud-ra-575') ? (
 <Audit575Worksheet />
 ) : (checklistKey === 'aud-ra-580') ? (
 <Audit580Worksheet />
 ) : (checklistKey === 'aud-ra-590') ? (
 <Audit590Worksheet />
 ) : (checklistKey === 'aud-rp-605') ? (
 <Audit605Worksheet />
 ) : (checklistKey === 'aud-rp-610') ? (
 <Audit610Worksheet />
 ) : (checklistKey === 'aud-rp-625') ? (
 <Audit625Worksheet />
 ) : (checklistKey === 'aud-rp-630') ? (
 <Audit630Worksheet />
 ) : (checklistKey === 'aud-rp-635') ? (
 <Audit635Worksheet />
 ) : (checklistKey === 'aud-rp-645') ? (
 <Audit645Worksheet />
 ) : (checklistKey === 'aud-rp-650') ? (
 <Audit650Worksheet />
 ) : (checklistKey === 'aud-rp-655') ? (
 <Audit655Worksheet />
 ) : (checklistKey === 'aud-rp-666') ? (
 <Audit666Worksheet />
 ) : (checklistKey === 'aud-rp-670') ? (
 <Audit670Worksheet />
 ) : (checklistKey === 'aud-rp-680') ? (
 <Audit680Worksheet />
 ) : (checklistKey === 'aud-so-311') ? (
 <Audit311Worksheet />
 ) : (checklistKey === 'aud-so-320') ? (
 <Audit320Worksheet />
 ) : (checklistKey === 'aud-so-325') ? (
 <Audit325Worksheet />
 ) : (checklistKey === 'aud-so-330') ? (
 <Audit330Worksheet />
 ) : (checklistKey === 'aud-so-335') ? (
 <Audit335Worksheet />
 ) : (checklistKey === 'aud-so-340') ? (
 <Audit340Worksheet />
 ) : (checklistKey === 'aud-so-370') ? (
 <Audit370Worksheet />
 ) : (checklistKey === 'aud-so-375') ? (
 <Audit375Worksheet />
 ) : (checklistKey === 'aud-so-aim' || checklistKey === 'aud-us-so-aim') ? (
 <AuditAIMWorksheet />
 ) : (checklistKey === 'aud-so-sign') ? (
 <AuditSOSignoffsWorksheet />
 ) : (checklistKey === 'aud-so-fr') ? (
 <AuditFinalReviewWorksheet />
 ) : checklist ? (
 <div className="p-4 bg-background">
 {/* ASM import banner */}
 {(checklistKey === 'aud-asm' || checklistKey === 'aud-us-asm') && checklist && (
 <AuditASMImportBanner
 checklist={checklist}
 onUpdate={handleChecklistUpdate}
 isUS={checklistKey === 'aud-us-asm'}
 />
 )}
 {/* 506 Fraud import banner */}
 {checklistKey === 'aud-ra-506' && checklist && (
 <Audit506ImportBanner
 checklist={checklist}
 onUpdate={handleChecklistUpdate}
 connectedApps={connectedApps}
 onOpenConnectors={() => setConnectorsOpen(true)}
 />
 )}
 {/* 525 Going Concern import banner */}
 {checklistKey === 'aud-ra-525' && checklist && (
 <Audit525ImportBanner
 checklist={checklist}
 onUpdate={handleChecklistUpdate}
 connectedApps={connectedApps}
 onOpenConnectors={() => setConnectorsOpen(true)}
 />
 )}
 {/* Clipboard prompt banner */}
 {showClipboardPrompt && clipboardResponses && (
 <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-amber-50 rounded-lg border border-amber-300 shadow-sm">
 <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
 <History className="h-4 w-4 text-amber-600" />
 </div>
 <span className="text-sm font-medium text-amber-900 flex-1">Previous responses available for this checklist</span>
 <Button size="sm" variant="default" className="h-8 text-xs" onClick={applyClipboardResponses}>
 Add Previous responses
 </Button>
 <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setShowClipboardPrompt(false); setClipboardResponses(null); }}>
 Dismiss
 </Button>
 </div>
 )}
 {/* Latest global checklist document view */}
 {isLoading ? <div className="bg-card rounded-lg shadow-sm p-12 flex flex-col items-center justify-center gap-4">
 <Loader2 className="h-8 w-8 text-primary animate-spin" />
 <div className="text-center">
 <p className="text-sm font-medium text-foreground">Loading engagement checklist...</p>
 <p className="text-xs text-muted-foreground mt-1">Please wait while we fetch the data</p>
 </div>
 </div> : <div className="bg-background">
 {(checklist?.sections?.length > 0 && checklist.sections[0]?.questions?.length > 0 && checklist.sections[0].questions[0]?.answerType === 'none' && !checklist.objective) ? (
 <LetterView
 checklist={checklist}
 onUpdate={handleChecklistUpdate}
 isEditing={isLetterEditing}
 onEditStart={() => setIsLetterEditing(true)}
 onSaveEdits={() => setIsLetterEditing(false)}
 onCancelEdits={() => setIsLetterEditing(false)}
 saveRef={letterSaveRef}
 clientName={clientName !== "Unknown Client" ? clientName : undefined}
 />
 ) : (
 <DocumentView
 checklist={checklist}
 onUpdate={handleChecklistUpdate}
 isPreviewMode={false}
 isCompactMode={isCompactMode}
 selectedQuestions={selectedQuestions}
 onSelectionChange={setSelectedQuestions}
 isEngagementMode={true}
 applyingQuestionId={liveApplyingId ?? clientResponses.applyingQuestionId}
 objectiveExpanded={objectiveExpanded}
 onToggleObjective={() => setObjectiveExpanded(prev => !prev)}
 />
 )}
 </div>}
 </div>
 ) : (
 <div className="flex-1 flex flex-col items-center justify-center py-32">
 <div className="w-28 h-28 mb-6 relative">
 <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
 <circle cx="60" cy="60" r="50" fill="hsl(var(--primary) / 0.08)" />
 <path d="M60 25L85 38V58C85 74 74 88 60 93C46 88 35 74 35 58V38L60 25Z" fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary) / 0.3)" strokeWidth="2" />
 <circle cx="60" cy="58" r="12" fill="hsl(var(--primary) / 0.25)" />
 <path d="M55 58L59 62L66 54" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
 <circle cx="40" cy="35" r="3" fill="hsl(var(--primary) / 0.2)" />
 <circle cx="85" cy="45" r="4" fill="hsl(var(--primary) / 0.15)" />
 <circle cx="38" cy="75" r="3" fill="hsl(var(--primary) / 0.2)" />
 <circle cx="82" cy="72" r="2.5" fill="hsl(var(--primary) / 0.2)" />
 </svg>
 </div>
 <h3 className="text-lg font-semibold text-foreground mb-2">No checklist available</h3>
 <p className="text-sm text-muted-foreground text-center max-w-xs">
 Currently there is no checklist available.<br />Please add a checklist
 </p>
 </div>
 )}
 </div>

 {/* Floating Action Bar for Preview Mode - Inside content area */}
 {checklist && !FS_PAGE_KEYS.has(checklistKey ?? '') && !checklistKey?.startsWith('notes-') && !(checklistKey && checklistKey !== 'aud-ra-pap501a' && (checklistKey in CUSTOM_WORKSHEET_TITLES || WORKSHEET_KEYS.has(checklistKey))) && <FloatingActionBar checklist={checklist ?? undefined} onUpdate={handleChecklistUpdate} onCollapseSections={handleCollapseSections} onExpandSections={handleExpandSections} onCollapseQuestions={handleCollapseQuestions} onExpandQuestions={handleExpandQuestions} allSectionsCollapsed={allSectionsCollapsed} allQuestionsCollapsed={allQuestionsCollapsed} isCompactMode={isCompactMode} onToggleCompactMode={handleToggleCompactMode} selectedQuestions={selectedQuestions} onBulkDelete={handleBulkDelete} onAddCategory={handleAddCategory} onBulkAnswer={handleBulkAnswer} onBulkClear={handleBulkClear} onBulkRestore={handleBulkRestore} isPreviewMode={true} isChecklist={!!checklist && !(checklist.sections?.length && checklist.sections[0]?.questions?.length && checklist.sections[0].questions[0]?.answerType === 'none' && !checklist.objective)} totalQuestions={allTopLevelQuestionIds.length} onSelectAll={handleSelectAll} />}
 </div>

 {/* Right Panel or Add Checklist Sheet */}
 {showAddChecklistSheet ? (
 <AddChecklistSheet open={showAddChecklistSheet} onClose={() => setShowAddChecklistSheet(false)} onSelect={handleAddChecklist} />
 ) : (
 <EngagementRightPanel />
 )}

 {/* Document Request Panel */}
 <Sheet open={showRequestPanel} onOpenChange={(v) => { setShowRequestPanel(v); if (!v) setRequestPanelFullscreen(false); }}>
 <SheetContent
 side="right"
 className={`p-0 flex flex-col overflow-hidden [&>button.absolute]:hidden ${
 requestPanelFullscreen
 ? "!w-screen !max-w-none rounded-none"
 : "!w-[900px] !max-w-[900px] rounded-l-2xl"
 }`}
 >
 <SheetHeader className="px-6 py-3 border-b border-border shrink-0 flex-row items-center justify-between space-y-0">
 <SheetTitle className="text-base font-semibold flex items-center gap-2">
 <ClipboardList className="h-4 w-4 text-muted-foreground" />
 Information / Analysis Requested from Management
 </SheetTitle>
 <div className="flex items-center gap-1 shrink-0">
 <Tooltip>
 <TooltipTrigger asChild>
 <button
 onClick={() => window.open(window.location.href, '_blank')}
 className="action-icon"
 aria-label="Open in new window"
 >
 <ExternalLink size={16} />
 </button>
 </TooltipTrigger>
 <TooltipContent side="bottom"><p>Open in new window</p></TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <button
 onClick={() => setRequestPanelFullscreen(v => !v)}
 className={`action-icon ${requestPanelFullscreen ? "action-icon-active" : ""}`}
 aria-label={requestPanelFullscreen ? "Exit fullscreen" : "Fullscreen"}
 >
 {requestPanelFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
 </button>
 </TooltipTrigger>
 <TooltipContent side="bottom"><p>{requestPanelFullscreen ? "Exit fullscreen" : "Fullscreen"}</p></TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <button
 onClick={() => setShowRequestPanel(false)}
 className="action-icon"
 aria-label="Minimize"
 >
 <Minus size={16} />
 </button>
 </TooltipTrigger>
 <TooltipContent side="bottom"><p>Minimize</p></TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <button
 onClick={() => setShowRequestPanel(false)}
 className="action-icon"
 aria-label="Close"
 >
 <X size={16} />
 </button>
 </TooltipTrigger>
 <TooltipContent side="bottom"><p>Close</p></TooltipContent>
 </Tooltip>
 </div>
 </SheetHeader>
 <div className="flex-1 min-h-0 overflow-hidden">
 <BulkRequestsWorksheet />
 </div>
 </SheetContent>
 </Sheet>

 {/* Delete Checklist Confirmation */}
 <DeleteChecklistDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} onConfirm={handleDeleteChecklist} />


 <AssignmentDialog
 open={showAssignDialog}
 onOpenChange={setShowAssignDialog}
 checklistName={checklist?.title}
 hasSelectedQuestions={selectedQuestions.size > 0}
 onConfirm={handleAssignConfirm}
 />

 {/* Share with Client Dialog */}
 <ShareWithClientDialog
 open={showShareDialog}
 onOpenChange={setShowShareDialog}
 checklistName={checklist?.title ?? (checklistKey?.startsWith('custom-') ? readJsonFromLocalStorage<CustomSection[]>(`engagement-custom-sections-${engagementId}`, []).find(s => s.id === checklistKey)?.name : undefined)}
 onConfirm={handleShareConfirm}
 isLetter={checklistKey?.startsWith('custom-') ? customLetterExists : !!(checklist?.sections?.length && checklist.sections[0]?.questions?.length && checklist.sections[0].questions[0]?.answerType === 'none' && !checklist.objective)}
 />

 <ConnectorsModal
 open={connectorsOpen}
 onOpenChange={(v) => { setConnectorsOpen(v); if (!v) setScrollToConnectorId(undefined); }}
 connectedApps={connectedApps}
 onConnect={handleConnectorConnect}
 onDisconnect={handleConnectorDisconnect}
 scrollToConnectorId={scrollToConnectorId}
 />

 {/* Client Response Dialog */}
 <ClientResponseDialog open={showResponseDialog} onOpenChange={setShowResponseDialog} totalQuestions={clientResponses.totalQuestions} answeredQuestions={clientResponses.answeredQuestions} responses={clientResponses.responses} onAcceptSelected={handleAcceptSelectedResponses} isApplying={clientResponses.isApplyingResponses} checklist={checklist} />

 {/* Switch Engagement Confirmation Dialog */}
 <Dialog open={showSwitchDialog} onOpenChange={setShowSwitchDialog}>
 <DialogContent className="sm:max-w-[400px] bg-card border shadow-xl rounded-2xl p-6">
 <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground" />
 <div className="flex flex-col items-center text-center gap-4">
 {/* Warning Icon */}
 <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
 <AlertTriangle className="h-6 w-6 text-amber-500" />
 </div>
 
 {/* Title */}
 <DialogHeader className="space-y-2">
 <DialogTitle className="text-lg font-semibold text-foreground">
 You are switching to another engagement
 </DialogTitle>
 <DialogDescription className="text-sm text-muted-foreground">
 Are you sure you want to switch to the selected engagement?
 </DialogDescription>
 </DialogHeader>
 
 {/* Action Buttons */}
 <DialogFooter className="flex flex-row gap-3 w-full sm:justify-center pt-2">
 <Button variant="outline" onClick={cancelEngagementSwitch} className="flex-1 h-10">
 No
 </Button>
 <Button onClick={confirmEngagementSwitch} className="flex-1 h-10 bg-[#1C63A6] hover:bg-[#1a5a9e]">
 Yes
 </Button>
 </DialogFooter>
 </div>
 </DialogContent>
 </Dialog>

 {/* Switch Client Confirmation Dialog */}
 <Dialog open={showClientSwitchDialog} onOpenChange={setShowClientSwitchDialog}>
 <DialogContent className="sm:max-w-[440px] bg-card border shadow-xl rounded-2xl p-6">
 <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground" />
 <div className="flex flex-col items-center text-center gap-4">
 {/* Warning Icon */}
 <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
 <AlertTriangle className="h-6 w-6 text-amber-500" />
 </div>
 
 {/* Title */}
 <DialogHeader className="space-y-2">
 <DialogTitle className="text-lg font-semibold text-foreground">
 You are switching to another client
 </DialogTitle>
 <DialogDescription className="text-sm text-muted-foreground">
 Select an engagement for {pendingClient} to continue.
 </DialogDescription>
 </DialogHeader>
 
 {/* Engagement List */}
 <div className="w-full border rounded-lg divide-y max-h-48 overflow-y-auto">
 {pendingClientEngagements.map(eng => <button key={eng.id} onClick={() => setSelectedClientEngagement(eng.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${selectedClientEngagement === eng.id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-muted/50'}`}>
 <div className="flex flex-col flex-1 min-w-0">
 <span className="font-mono text-sm font-medium truncate">{eng.id}</span>
 <div className="flex items-center gap-2 mt-0.5">
 <Calendar className="h-3 w-3 text-muted-foreground" />
 <span className="text-xs text-muted-foreground">{eng.yearEnd}</span>
 <span className="text-xs text-muted-foreground">•</span>
 <span className="text-xs text-muted-foreground">{eng.type}</span>
 </div>
 </div>
 {selectedClientEngagement === eng.id && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
 </button>)}
 </div>
 
 {/* Action Buttons */}
 <DialogFooter className="flex flex-row gap-3 w-full sm:justify-center pt-2">
 <Button variant="outline" onClick={cancelClientSwitch} className="flex-1 h-10">
 No
 </Button>
 <Button onClick={confirmClientSwitch} disabled={!selectedClientEngagement} className="flex-1 h-10 bg-[#1C63A6] hover:bg-[#1a5a9e]">
 Yes
 </Button>
 </DialogFooter>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 </Layout>
 <AskLukaOverlay
 open={lukaOpen}
 onOpenChange={(o) => {
 setLukaOpen(o);
 if (!o) {
 setLukaAutoFillConfig(null); setLukaFillSummary(null); setLukaAllTemplateSummary(null); setLukaAutoFillProgress(null); setLukaEngagementOverviewMode(false); setLukaInitialTab("threads"); setLukaInitialWorkspaceEngagement(undefined); setLukaPap501Config(null); setLukaQuery(""); setLukaInitialAiMessage(""); setLukaInitialAiMessagePrompts([]);
 }
 }}
 initialQuery={lukaQuery}
 initialAiMessage={lukaInitialAiMessage}
 initialAiMessagePrompts={lukaInitialAiMessagePrompts.length ? lukaInitialAiMessagePrompts : undefined}
 autoFillMode={!!lukaAutoFillConfig}
 checklistLabel={lukaAutoFillConfig?.label}
 engagementLabel={lukaAutoFillConfig?.engagementLabel ?? lukaPap501Config?.engLabel}
 autoFillSources={lukaAutoFillConfig?.sources}
 pap501Mode={!!lukaPap501Config}
 pap501IsRegenerate={!!lukaPap501Config?.isRegenerate}
 pap501Sources={lukaPap501Config?.sources}
 onPap501Accept={() => {
 window.dispatchEvent(new CustomEvent('pap501-luka-accepted', { detail: { engagementId } }));
 setPap501Accepted(true);
 setLukaOpen(false);
 if (checklistKey === 'aud-ra-pap501a') {
 navigate(`/engagements/${engagementId}/checklist/aud-ra-pap501bc`);
 } else {
 autofill501BChecklist();
 toast.success('501-A complete · Luka auto-filled 501-B', {
 duration: 8000,
 action: {
 label: 'View 501-B →',
 onClick: () => navigate(`/engagements/${engagementId}/checklist/aud-ra-pap501a`),
 },
 });
 }
 }}
 onAutoFillConfirmed={handleAutoFillConfirmed}
 onAutoFillAll={handleAutoFillAll}
 onAutoFillFromThread={handleAutoFillFromThread}
 summaryMode={!!lukaFillSummary}
 fillSummary={lukaFillSummary ?? undefined}
 allTemplateSummary={lukaAllTemplateSummary ?? undefined}
 autoFillProgress={lukaAutoFillProgress ?? undefined}
 nextChecklistLabel={nextChecklistLabel}
 onNavigateNext={nextChecklistKey ? () => navigate(`/engagements/${engagementId}/checklist/${nextChecklistKey}`) : undefined}
 engagementOverviewMode={lukaEngagementOverviewMode}
 onOpenEngagementSheet={() => {
 setLukaAllTemplateSummary(null);
 setLukaFillSummary(null);
 setLukaEngagementOverviewMode(true);
 }}
 onStartSectionBySection={() => { setLukaOpen(false); navigate(`/engagements/${engagementId}/checklist/aud-form-410`); }}
 initialTab={lukaInitialTab}
 initialWorkspaceEngagement={lukaInitialWorkspaceEngagement}
 currentEngagementId={engagementId}
 currentChecklistKey={checklistKey}
 />
 <NotesSlidePanel
 open={!!notePanel}
 onOpenChange={open => { if (!open) setNotePanel(null); }}
 noteId={notePanel?.noteId ?? null}
 noteName={notePanel?.noteName ?? ''}
 engId={engagementId ?? ''}
 />

 </>;
}