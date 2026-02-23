import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedLayoutRoute } from "@/components/auth/ProtectedLayoutRoute";
import { SuperAdminRoute } from "@/components/auth/SuperAdminRoute";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";

// Pages
import Login from "./pages/Login";
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
import MarketingAutomations from "./pages/marketing/Automations";
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
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/f/:slug" element={<PublicLeadForm />} />
            <Route path="/f/:slug/:formSlug" element={<PublicLeadForm />} />
            <Route path="/c/:slug" element={<ConversationalLeadForm />} />
            <Route path="/c/:slug/:formSlug" element={<ConversationalLeadForm />} />
            <Route path="/invite/:token" element={<InviteRegister />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/install" element={<Install />} />

            {/* Protected Routes (Persistent Layout) */}
            <Route element={<ProtectedLayoutRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/proposals" element={<Proposals />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/financeiro" element={<Finance />} />
              <Route path="/financeiro/pagamentos" element={<FinancePayments />} />
              <Route path="/financeiro/faturas" element={<FinanceInvoices />} />
              <Route path="/financeiro/despesas" element={<FinanceExpenses />} />
              <Route path="/ecommerce" element={<Ecommerce />} />
              <Route path="/ecommerce/products" element={<EcommerceProducts />} />
              <Route path="/ecommerce/orders" element={<EcommerceOrders />} />
              <Route path="/ecommerce/customers" element={<EcommerceCustomers />} />
              <Route path="/ecommerce/inventory" element={<EcommerceInventory />} />
              <Route path="/ecommerce/discounts" element={<EcommerceDiscounts />} />
              <Route path="/ecommerce/reports" element={<EcommerceReports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/marketing" element={<Marketing />} />
              <Route path="/marketing/templates" element={<MarketingTemplates />} />
              <Route path="/marketing/campaigns" element={<MarketingCampaigns />} />
              <Route path="/marketing/reports" element={<MarketingReports />} />
              <Route path="/marketing/lists" element={<MarketingLists />} />
              <Route path="/marketing/automations" element={<MarketingAutomations />} />
            </Route>

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
