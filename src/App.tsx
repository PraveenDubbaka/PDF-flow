import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import Generate from "./pages/Generate";
import CreationDashboard from "./pages/CreationDashboard";
import Dashboard from "./pages/Dashboard";
import Engagements from "./pages/Engagements";
import EngagementDetail from "./pages/EngagementDetail";
import CreateEngagement from "./pages/CreateEngagement";
import CreateNewEngagement from "./pages/CreateNewEngagement";
import AddNewClientV2 from "./pages/AddNewClientV2";
import Clients from "./pages/Clients";
import AddNewClient from "./pages/AddNewClient";
import ClientDetail from "./pages/ClientDetail";
import TrialBalance from "./pages/TrialBalance";
import Workbook from "./pages/Workbook";
import ProcedureDetail from "./pages/ProcedureDetail";
import { GcaProcPage } from "./pages/GcaProcPage";
import Teams from "./pages/Teams";
import DesignSystem from "./pages/DesignSystem";
import EngagementTemplates from "./pages/EngagementTemplates";
import FinancialStatementTemplates from "./pages/FinancialStatementTemplates";
import AuditDependencyRegister from "./pages/AuditDependencyRegister";
import NotFound from "./pages/NotFound";
import { EngagementsProvider } from "./store/EngagementsContext";

const queryClient = new QueryClient();

const App = () => (
 <QueryClientProvider client={queryClient}>
 <ThemeProvider>
 <TooltipProvider>
 <Toaster />
 <Sonner />
 <BrowserRouter basename={import.meta.env.BASE_URL}>
 <EngagementsProvider>
 <Routes>
 <Route path="/" element={<Navigate to="/dashboard" replace />} />
 <Route path="/dashboard" element={<Dashboard />} />
 <Route path="/clients" element={<Clients />} />
 <Route path="/clients/add-new" element={<AddNewClientV2 />} />
 <Route path="/clients/new" element={<AddNewClient />} />
 <Route path="/clients/:clientId" element={<ClientDetail />} />
 <Route path="/teams" element={<Teams />} />
 <Route path="/engagements" element={<Engagements />} />
 <Route path="/engagements/:engagementId" element={<EngagementDetail />} />
 <Route path="/engagements/:engagementId/checklist/:checklistKey" element={<EngagementDetail />} />
 <Route path="/engagements/create-new" element={<CreateNewEngagement />} />
         <Route path="/engagements/create" element={<CreateEngagement />} />
 <Route path="/engagements/:engagementId/trial-balance" element={<TrialBalance />} />
 <Route path="/engagements/:engagementId/workbook" element={<Workbook />} />
 <Route path="/engagements/:engagementId/procedure/:procedureId" element={<ProcedureDetail />} />
 <Route path="/engagements/:engagementId/gca-proc/:worksheetId" element={<GcaProcPage />} />
 <Route path="/engagements/:engagementId/dependency-register" element={<AuditDependencyRegister />} />
 <Route path="/create" element={<CreationDashboard />} />
 <Route path="/builder" element={<Index />} />
 <Route path="/generate" element={<Generate />} />
 <Route path="/engagement-templates" element={<EngagementTemplates />} />
 <Route path="/financial-statement-templates" element={<FinancialStatementTemplates />} />
 <Route path="/design-system" element={<DesignSystem />} />
 {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
 <Route path="*" element={<NotFound />} />
 </Routes>
 </EngagementsProvider>
 </BrowserRouter>
 </TooltipProvider>
 </ThemeProvider>
 </QueryClientProvider>
);

export default App;
