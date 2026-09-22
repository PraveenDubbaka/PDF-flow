import { useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import TemplatePreview from "@/components/dashboard/templates/TemplatePreview";

const dispatchEditMode = (active: boolean) =>
 window.dispatchEvent(new CustomEvent("fs-template-edit-mode", { detail: { active } }));

export default function FinancialStatementTemplates() {
 const [searchParams] = useSearchParams();
 const template = searchParams.get("template");
 const isMyTemplates = searchParams.get("source") === "my";

 return (
 <Layout title="Templates">
 <TemplatePreview
 selectedTemplate={template ? decodeURIComponent(template) : null}
 isMyTemplates={isMyTemplates}
 onCollapseSidebar={dispatchEditMode}
 />
 </Layout>
 );
}
