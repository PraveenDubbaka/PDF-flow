import CoverPagePreview from "@/components/dashboard/workspace/CoverPagePreview";
import TableOfContentsPreview from "@/components/dashboard/workspace/TableOfContentsPreview";
import CompilationReportPreview from "@/components/dashboard/workspace/CompilationReportPreview";
import AuditorReportPreview from "@/components/dashboard/workspace/AuditorReportPreview";
import BalanceSheetPreview from "@/components/dashboard/workspace/BalanceSheetPreview";
import IncomeStatementPreview from "@/components/dashboard/workspace/IncomeStatementPreview";
import CashFlowsPreview from "@/components/dashboard/workspace/CashFlowsPreview";
import NotesPreview from "@/components/dashboard/workspace/NotesPreview";

export type FSPageType = 'cover' | 'toc' | 'bs' | 'is' | 'cf' | 'eq' | 'notes' | 'comp-report' | 'auditor-report';

interface FSPageViewerProps {
 pageType: FSPageType;
 isEditing?: boolean;
 isCompilation?: boolean;
 isUS?: boolean;
 engagementId?: string;
}

const FSPageContent = ({ pageType, isEditing, isCompilation }: FSPageViewerProps) => {
 const templateType = isCompilation ? 'compilation' : null;

 switch (pageType) {
 case 'cover':
 return <CoverPagePreview isEditMode={isEditing} templateType={templateType ?? undefined} />;
 case 'toc':
 return <TableOfContentsPreview />;
 case 'comp-report':
 return <CompilationReportPreview />;
 case 'auditor-report':
 return <AuditorReportPreview />;
 case 'bs':
 return <BalanceSheetPreview isEditMode={isEditing} />;
 case 'is':
 case 'eq':
 return <IncomeStatementPreview isEditMode={isEditing} />;
 case 'cf':
 return <CashFlowsPreview isEditMode={isEditing} />;
 case 'notes':
 return <NotesPreview isEditMode={isEditing} />;
 default:
 return null;
 }
};

const FSPageViewer = (props: FSPageViewerProps) => <FSPageContent {...props} />;

export default FSPageViewer;
