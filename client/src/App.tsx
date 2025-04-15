import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import GuestsPage from "@/pages/guests-page";
import CleaningPage from "@/pages/cleaning-page";
import MobileCleaningPage from "@/pages/mobile-cleaning-page";
import MaintenancePage from "@/pages/maintenance-page";
import InventoryPage from "@/pages/inventory-page";
// Using the new Team page implementation
import TeamPage from "@/pages/team-page-new";
import CompanyPage from "@/pages/company-page";
import AiToolsPage from "@/pages/ai-tools-page";
import AdminPage from "@/pages/admin-page";
import PropertiesPage from "@/pages/properties-page";
import PropertyDetailPage from "@/pages/property-detail-page";
import UnitDetailPage from "@/pages/unit-detail-page";
import ProjectsPage from "@/pages/projects-page";
import ProjectDetailPage from "@/pages/project-detail-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/guests" component={GuestsPage} />
      <ProtectedRoute path="/cleaning" component={CleaningPage} />
      <ProtectedRoute path="/mobile-cleaning" component={MobileCleaningPage} />
      <ProtectedRoute path="/maintenance" component={MaintenancePage} />
      <ProtectedRoute path="/inventory" component={InventoryPage} />
      <ProtectedRoute path="/team" component={TeamPage} />
      <ProtectedRoute path="/company" component={CompanyPage} />
      <ProtectedRoute path="/ai-tools" component={AiToolsPage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <ProtectedRoute path="/properties" component={PropertiesPage} />
      <ProtectedRoute path="/properties/:id" component={PropertyDetailPage} />
      <ProtectedRoute path="/unit/:id" component={UnitDetailPage} />
      <ProtectedRoute path="/projects" component={ProjectsPage} />
      <ProtectedRoute path="/projects/:id" component={ProjectDetailPage} />
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
