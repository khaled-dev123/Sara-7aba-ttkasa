import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/components/shared";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/layouts/AppLayout";

// Auth
import LoginPage from "@/pages/auth/LoginPage";

// Admin
import AdminDashboard from "@/pages/admin/Dashboard";
import ProductsBuyPage from "@/pages/admin/ProductsBuyPage";
import ProductsSellPage from "@/pages/admin/ProductsSellPage";
import ProductsStockPage from "@/pages/admin/ProductsStockPage";
import ProductDetailsPage from "@/pages/admin/ProductDetailsPage";
import CategoriesPage from "@/pages/admin/CategoriesPage";
import SuppliersPage from "@/pages/admin/SuppliersPage";
import MarketsPage from "@/pages/admin/MarketsPage";
import MarketDetailsPage from "@/pages/admin/MarketDetailsPage";
import OrdersPage from "@/pages/admin/OrdersPage";
import OrderDetailsPage from "@/pages/admin/OrderDetailsPage";
import AuditLogsPage from "@/pages/admin/AuditLogsPage";
import ReportsPage from "@/pages/admin/ReportsPage";
import SettingsPage from "@/pages/admin/SettingsPage";

// Market
import MarketDashboard from "@/pages/market/MarketDashboard";
import MarketOrdersPage from "@/pages/market/MarketOrdersPage";
import MarketProductsPage from "@/pages/market/MarketProductsPage";

// Warehouse
import WarehouseDashboard from "@/pages/warehouse/WarehouseDashboard";
import WarehouseOrdersPage from "@/pages/warehouse/WarehouseOrdersPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RoleRedirect() {
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <TooltipProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />

                  {/* Admin Routes */}
                  <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AppLayout><AdminDashboard /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/products/buy" element={<ProtectedRoute roles={["admin"]}><AppLayout><ProductsBuyPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/products/sell" element={<ProtectedRoute roles={["admin"]}><AppLayout><ProductsSellPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/products/stock" element={<ProtectedRoute roles={["admin"]}><AppLayout><ProductsStockPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/products/:id" element={<ProtectedRoute roles={["admin"]}><AppLayout><ProductDetailsPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/categories" element={<ProtectedRoute roles={["admin"]}><AppLayout><CategoriesPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/suppliers" element={<ProtectedRoute roles={["admin"]}><AppLayout><SuppliersPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/markets" element={<ProtectedRoute roles={["admin"]}><AppLayout><MarketsPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/markets/:id" element={<ProtectedRoute roles={["admin"]}><AppLayout><MarketDetailsPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/orders" element={<ProtectedRoute roles={["admin"]}><AppLayout><OrdersPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/orders/:id" element={<ProtectedRoute roles={["admin"]}><AppLayout><OrderDetailsPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/audit-logs" element={<ProtectedRoute roles={["admin"]}><AppLayout><AuditLogsPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/reports" element={<ProtectedRoute roles={["admin"]}><AppLayout><ReportsPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/settings" element={<ProtectedRoute roles={["admin"]}><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />

                  {/* Market Routes */}
                  <Route path="/market" element={<ProtectedRoute roles={["market"]}><AppLayout><MarketDashboard /></AppLayout></ProtectedRoute>} />
                  <Route path="/market/products" element={<ProtectedRoute roles={["market"]}><AppLayout><MarketProductsPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/market/cart" element={<Navigate to="/market/products" replace />} />
                  <Route path="/market/orders" element={<ProtectedRoute roles={["market"]}><AppLayout><MarketOrdersPage /></AppLayout></ProtectedRoute>} />

                  {/* Warehouse Routes */}
                  <Route path="/warehouse" element={<ProtectedRoute roles={["warehouse"]}><AppLayout><WarehouseDashboard /></AppLayout></ProtectedRoute>} />
                  <Route path="/warehouse/orders" element={<ProtectedRoute roles={["warehouse"]}><AppLayout><WarehouseOrdersPage /></AppLayout></ProtectedRoute>} />

                  <Route path="*" element={<RoleRedirect />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
