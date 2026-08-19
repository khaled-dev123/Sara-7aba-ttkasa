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
import ProductsPage from "@/pages/admin/ProductsPage";
import ProductDetailsPage from "@/pages/admin/ProductDetailsPage";
import CategoriesPage from "@/pages/admin/CategoriesPage";
import SuppliersPage from "@/pages/admin/SuppliersPage";
import MarketsPage from "@/pages/admin/MarketsPage";
import MarketDetailsPage from "@/pages/admin/MarketDetailsPage";
import OrdersPage from "@/pages/admin/OrdersPage";
import OrderDetailsPage from "@/pages/admin/OrderDetailsPage";
import DeliveriesPage from "@/pages/admin/DeliveriesPage";
import DeliveryDetailsPage from "@/pages/admin/DeliveryDetailsPage";
import AnalyticsPage from "@/pages/admin/AnalyticsPage";
import AuditLogsPage from "@/pages/admin/AuditLogsPage";
import ReportsPage from "@/pages/admin/ReportsPage";
import SettingsPage from "@/pages/admin/SettingsPage";

// Market
import MarketDashboard from "@/pages/market/MarketDashboard";
import MarketProductsPage from "@/pages/market/MarketProductsPage";
import MarketCartPage from "@/pages/market/MarketCartPage";
import MarketOrdersPage from "@/pages/market/MarketOrdersPage";

// Warehouse
import WarehouseDashboard from "@/pages/warehouse/WarehouseDashboard";
import WarehouseOrdersPage from "@/pages/warehouse/WarehouseOrdersPage";
import WarehouseDeliveriesPage from "@/pages/warehouse/WarehouseDeliveriesPage";

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
                  <Route path="/admin/products" element={<ProtectedRoute roles={["admin"]}><AppLayout><ProductsPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/products/:id" element={<ProtectedRoute roles={["admin"]}><AppLayout><ProductDetailsPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/categories" element={<ProtectedRoute roles={["admin"]}><AppLayout><CategoriesPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/suppliers" element={<ProtectedRoute roles={["admin"]}><AppLayout><SuppliersPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/markets" element={<ProtectedRoute roles={["admin"]}><AppLayout><MarketsPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/markets/:id" element={<ProtectedRoute roles={["admin"]}><AppLayout><MarketDetailsPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/orders" element={<ProtectedRoute roles={["admin"]}><AppLayout><OrdersPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/orders/:id" element={<ProtectedRoute roles={["admin"]}><AppLayout><OrderDetailsPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/deliveries" element={<ProtectedRoute roles={["admin"]}><AppLayout><DeliveriesPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/deliveries/:id" element={<ProtectedRoute roles={["admin"]}><AppLayout><DeliveryDetailsPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/analytics" element={<ProtectedRoute roles={["admin"]}><AppLayout><AnalyticsPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/audit-logs" element={<ProtectedRoute roles={["admin"]}><AppLayout><AuditLogsPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/reports" element={<ProtectedRoute roles={["admin"]}><AppLayout><ReportsPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/admin/settings" element={<ProtectedRoute roles={["admin"]}><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />

                  {/* Market Routes */}
                  <Route path="/market" element={<ProtectedRoute roles={["market"]}><AppLayout><MarketDashboard /></AppLayout></ProtectedRoute>} />
                  <Route path="/market/products" element={<ProtectedRoute roles={["market"]}><AppLayout><MarketProductsPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/market/cart" element={<ProtectedRoute roles={["market"]}><AppLayout><MarketCartPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/market/orders" element={<ProtectedRoute roles={["market"]}><AppLayout><MarketOrdersPage /></AppLayout></ProtectedRoute>} />

                  {/* Warehouse Routes */}
                  <Route path="/warehouse" element={<ProtectedRoute roles={["warehouse"]}><AppLayout><WarehouseDashboard /></AppLayout></ProtectedRoute>} />
                  <Route path="/warehouse/orders" element={<ProtectedRoute roles={["warehouse"]}><AppLayout><WarehouseOrdersPage /></AppLayout></ProtectedRoute>} />
                  <Route path="/warehouse/deliveries" element={<ProtectedRoute roles={["warehouse"]}><AppLayout><WarehouseDeliveriesPage /></AppLayout></ProtectedRoute>} />

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
