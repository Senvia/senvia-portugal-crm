import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SuperAdminRoute } from "@/components/auth/SuperAdminRoute";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";

// Pages
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Clients from "./pages/Clients";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
import Proposals from "./pages/Proposals";
import Sales from "./pages/Sales";
import Finance from "./pages/Finance";
import FinancePayments from "./pages/finance/Payments";
import FinanceInvoices from "./pages/finance/Invoices";
import FinanceExpenses from "./pages/finance/Expenses";
import Ecommerce from "./pages/Ecommerce";
import Marketing from "./pages/Marketing";
import MarketingTemplates from "./pages/marketing/Templates";
import MarketingCampaigns from "./pages/marketing/Campaigns";
import MarketingReports from "./pages/marketing/Reports";
import MarketingLists from "./pages/marketing/Lists";
import EcommerceProducts from "./pages/ecommerce/Products";
import EcommerceOrders from "./pages/ecommerce/Orders";
import EcommerceCustomers from "./pages/ecommerce/Customers";
import EcommerceInventory from "./pages/ecommerce/Inventory";
import EcommerceDiscounts from "./pages/ecommerce/Discounts";
import EcommerceReports from "./pages/ecommerce/Reports";
import PublicLeadForm from "./pages/PublicLeadForm";
import ConversationalLeadForm from "./pages/ConversationalLeadForm";
import InviteRegister from "./pages/InviteRegister";
import ResetPassword from "./pages/ResetPassword";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

// Super Admin Pages
import SystemAdminDashboard from "./pages/system-admin/Dashboard";
import SystemAdminOrganizations from "./pages/system-admin/Organizations";
import SystemAdminUsers from "./pages/system-admin/Users";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PWAInstallButton />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/f/:slug" element={<PublicLeadForm />} />
            <Route path="/f/:slug/:formSlug" element={<PublicLeadForm />} />
            <Route path="/c/:slug" element={<ConversationalLeadForm />} />
            <Route path="/c/:slug/:formSlug" element={<ConversationalLeadForm />} />
            <Route path="/invite/:token" element={<InviteRegister />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/install" element={<Install />} />

            {/* Protected Routes (Authenticated Users) */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/leads" element={
              <ProtectedRoute>
                <Leads />
              </ProtectedRoute>
            } />
            <Route path="/clients" element={
              <ProtectedRoute>
                <Clients />
              </ProtectedRoute>
            } />
            <Route path="/calendar" element={
              <ProtectedRoute>
                <Calendar />
              </ProtectedRoute>
            } />
            <Route path="/proposals" element={
              <ProtectedRoute>
                <Proposals />
              </ProtectedRoute>
            } />
            <Route path="/sales" element={
              <ProtectedRoute>
                <Sales />
              </ProtectedRoute>
            } />
            <Route path="/financeiro" element={
              <ProtectedRoute>
                <Finance />
              </ProtectedRoute>
            } />
            <Route path="/financeiro/pagamentos" element={
              <ProtectedRoute>
                <FinancePayments />
              </ProtectedRoute>
            } />
            <Route path="/financeiro/faturas" element={
              <ProtectedRoute>
                <FinanceInvoices />
              </ProtectedRoute>
            } />
            <Route path="/financeiro/despesas" element={
              <ProtectedRoute>
                <FinanceExpenses />
              </ProtectedRoute>
            } />
            <Route path="/ecommerce" element={
              <ProtectedRoute>
                <Ecommerce />
              </ProtectedRoute>
            } />
            <Route path="/ecommerce/products" element={
              <ProtectedRoute>
                <EcommerceProducts />
              </ProtectedRoute>
            } />
            <Route path="/ecommerce/orders" element={
              <ProtectedRoute>
                <EcommerceOrders />
              </ProtectedRoute>
            } />
            <Route path="/ecommerce/customers" element={
              <ProtectedRoute>
                <EcommerceCustomers />
              </ProtectedRoute>
            } />
            <Route path="/ecommerce/inventory" element={
              <ProtectedRoute>
                <EcommerceInventory />
              </ProtectedRoute>
            } />
            <Route path="/ecommerce/discounts" element={
              <ProtectedRoute>
                <EcommerceDiscounts />
              </ProtectedRoute>
            } />
            <Route path="/ecommerce/reports" element={
              <ProtectedRoute>
                <EcommerceReports />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/marketing" element={
              <ProtectedRoute>
                <Marketing />
              </ProtectedRoute>
            } />
            <Route path="/marketing/templates" element={
              <ProtectedRoute>
                <MarketingTemplates />
              </ProtectedRoute>
            } />
            <Route path="/marketing/campaigns" element={
              <ProtectedRoute>
                <MarketingCampaigns />
              </ProtectedRoute>
            } />
            <Route path="/marketing/reports" element={
              <ProtectedRoute>
                <MarketingReports />
              </ProtectedRoute>
            } />
            <Route path="/marketing/lists" element={
              <ProtectedRoute>
                <MarketingLists />
              </ProtectedRoute>
            } />

            {/* Super Admin Routes */}
            <Route path="/system-admin" element={
              <SuperAdminRoute>
                <SystemAdminDashboard />
              </SuperAdminRoute>
            } />
            <Route path="/system-admin/organizations" element={
              <SuperAdminRoute>
                <SystemAdminOrganizations />
              </SuperAdminRoute>
            } />
            <Route path="/system-admin/users" element={
              <SuperAdminRoute>
                <SystemAdminUsers />
              </SuperAdminRoute>
            } />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
