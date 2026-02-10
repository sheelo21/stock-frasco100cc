import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import ScanPage from "@/pages/ScanPage";
import ProductPage from "@/pages/ProductPage";
import ProductListPage from "@/pages/ProductListPage";
import HistoryPage from "@/pages/HistoryPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <div className="mx-auto min-h-screen max-w-lg bg-background">
          <Routes>
            <Route path="/" element={<ScanPage />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
