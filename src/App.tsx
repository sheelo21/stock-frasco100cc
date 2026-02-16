import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import BottomNav from "@/components/BottomNav";
import ScanPage from "@/pages/ScanPage";
import ProductPage from "@/pages/ProductPage";
import ProductListPage from "@/pages/ProductListPage";
import InventoryListPage from "@/pages/InventoryListPage";
import HistoryPage from "@/pages/HistoryPage";
import AuthPage from "@/pages/AuthPage";
import AddProductPage from "@/pages/AddProductPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
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
        <Route path="/" element={<InventoryListPage />} />
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/products/add" element={<AddProductPage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
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
