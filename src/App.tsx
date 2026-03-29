import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-user-role";
import BottomNav from "@/components/BottomNav";
import ScanPage from "@/pages/ScanPage";
import ProductPage from "@/pages/ProductPage";
import ProductListPage from "@/pages/ProductListPage";
import InventoryListPage from "@/pages/InventoryListPage";
import HistoryPage from "@/pages/HistoryPage";
import AuthPage from "@/pages/AuthPage";
import AddProductPage from "@/pages/AddProductPage";
import SettingsPage from "@/pages/SettingsPage";
import SettingsDetailPage from "@/pages/SettingsDetailPage";
import UserManagementPage from "@/pages/UserManagementPage";
import OrderListPage from "@/pages/OrderListPage";
import OrderCreatePage from "@/pages/OrderCreatePage";
import OrderDetailPage from "@/pages/OrderDetailPage";
import DashboardPage from "@/pages/DashboardPage";
import CustomerManagementPage from "@/pages/CustomerManagementPage";
import DataExportPage from "@/pages/DataExportPage";
import InventorySchedulePage from "@/pages/InventorySchedulePage";
import ReportsPage from "@/pages/ReportsPage";
import SetupPage from "@/pages/SetupPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const { isClient, loading: roleLoading } = useUserRole();

  if (loading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl bg-background">
      <Routes>
        <Route path="/" element={<ProductListPage />} />
        <Route path="/products" element={<ProductListPage />} />
        {!isClient && <Route path="/inventory" element={<InventoryListPage />} />}
        {!isClient && <Route path="/inventory/schedule" element={<InventorySchedulePage />} />}
        {!isClient && <Route path="/products/add" element={<AddProductPage />} />}
        {!isClient && <Route path="/product/:id" element={<ProductPage />} />}
        {!isClient && <Route path="/scan" element={<ScanPage />} />}
        {!isClient && <Route path="/history" element={<HistoryPage />} />}
        <Route path="/orders" element={<OrderListPage />} />
        <Route path="/orders/create" element={<OrderCreatePage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        {!isClient && <Route path="/export" element={<DataExportPage />} />}
        {!isClient && <Route path="/reports" element={<ReportsPage />} />}
        {!isClient && <Route path="/settings" element={<SettingsPage />} />}
        {!isClient && <Route path="/settings/dashboard" element={<DashboardPage />} />}
        {!isClient && <Route path="/settings/users" element={<UserManagementPage />} />}
        <Route path="/setup" element={<SetupPage />} />
        {!isClient && <Route path="/settings/:type" element={<SettingsDetailPage />} />}}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
