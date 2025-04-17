import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import GuestsPage from "@/pages/guests-page";
import CleaningPage from "@/pages/cleaning-page";
import CleaningSettingsPage from "@/pages/cleaning-settings-page";
import MobileCleaningPage from "@/pages/mobile-cleaning-page";
import MaintenancePage from "@/pages/maintenance-page";
import InventoryPage from "@/pages/inventory-page";
// Using the new Team page implementation
import TeamPage from "@/pages/team-page-new";
import CompanyPage from "@/pages/company-page";
import AiToolsPage from "@/pages/ai-tools-page";
import AdminPage from "@/pages/admin-page";
// New properties pages
import PropertiesNewPage from "@/pages/properties-new-page";
import PropertyDetailNewPage from "@/pages/property-detail-new-page";
import PropertyEditNewPage from "@/pages/property-edit-new-page";
import PropertyNewPage from "@/pages/property-new-page";
import UnitDetailPage from "@/pages/unit-detail-page";
import ProjectsPage from "@/pages/projects-page";
import ProjectDetailPage from "@/pages/project-detail-page";
// HostAI Inbox & AI Planner Pages
import HostAIInboxPage from "@/pages/hostai-inbox-page";
import HostAIInboxSettingsPage from "@/pages/hostai-inbox-settings-page";
import AiPlannerPage from "@/pages/ai-planner-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/guests" component={GuestsPage} />
      <ProtectedRoute path="/cleaning" component={CleaningPage} />
      <ProtectedRoute path="/cleaning-settings" component={CleaningSettingsPage} />
      <ProtectedRoute path="/mobile-cleaning" component={MobileCleaningPage} />
      <ProtectedRoute path="/maintenance" component={MaintenancePage} />
      <ProtectedRoute path="/inventory" component={InventoryPage} />
      <ProtectedRoute path="/team" component={TeamPage} />
      <ProtectedRoute path="/company" component={CompanyPage} />
      <ProtectedRoute path="/ai-tools" component={AiToolsPage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      {/* New properties routes */}
      <ProtectedRoute path="/properties" component={PropertiesNewPage} />
      <ProtectedRoute path="/properties/new" component={PropertyNewPage} />
      <ProtectedRoute path="/properties/:id/edit" component={PropertyEditNewPage} />
      <ProtectedRoute path="/properties/:id" component={PropertyDetailNewPage} />
      <ProtectedRoute path="/unit/:id" component={UnitDetailPage} />
      <ProtectedRoute path="/projects" component={ProjectsPage} />
      <ProtectedRoute path="/projects/:id" component={ProjectDetailPage} />
      {/* HostAI Task Inbox and AI Planner Routes */}
      <ProtectedRoute path="/projects-tasks/hostai-inbox" component={HostAIInboxPage} />
      <ProtectedRoute path="/projects-tasks/hostai-inbox/settings" component={HostAIInboxSettingsPage} />
      <ProtectedRoute path="/projects-tasks/ai-planner" component={AiPlannerPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
