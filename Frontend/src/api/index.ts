import api from "@/lib/api-client";
import type { Page, UserWithMarket, TokenPair, LoginResponse, Profile, Category, Supplier, ProductDetail, Market, OrderDetail, DashboardSummary, AuditLog, ProductAnalytics, MarketAnalytics, StockMovement, PurchaseOrderDetail, LowStockItem } from "@/types";

export const authApi = {
  profiles: () =>
    api.get<Profile[]>("/auth/profiles").then((r) => r.data),
  login: (username: string, password: string) =>
    api.post<LoginResponse>("/auth/login", { username, password }).then((r) => r.data),
  selectRole: (role: string, market_id?: number) =>
    api.post<TokenPair>("/auth/select-role", { role, market_id }).then((r) => r.data),
  refresh: (refresh_token: string) =>
    api.post<TokenPair>("/auth/refresh", { refresh_token }).then((r) => r.data),
  me: () => api.get<UserWithMarket>("/auth/me").then((r) => r.data),
  logout: (refresh_token: string) =>
    api.post("/auth/logout", { refresh_token }),
  changePassword: (old_password: string, new_password: string) =>
    api.post("/auth/change-password", { old_password, new_password }),
};

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>("/dashboard/summary").then((r) => r.data),
};

export const categoryApi = {
  list: () => api.get<Category[]>("/categories").then((r) => r.data),
  create: (data: { name: string; description?: string }) =>
    api.post<Category>("/categories", data).then((r) => r.data),
  update: (id: number, data: { name?: string; description?: string }) =>
    api.patch<Category>(`/categories/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/categories/${id}`),
};

export const supplierApi = {
  list: () => api.get<Supplier[]>("/suppliers").then((r) => r.data),
  create: (data: { name: string; phone?: string; email?: string; address?: string }) =>
    api.post<Supplier>("/suppliers", data).then((r) => r.data),
  update: (id: number, data: { name?: string; phone?: string; email?: string; address?: string }) =>
    api.patch<Supplier>(`/suppliers/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/suppliers/${id}`),
};

export const productApi = {
  list: (params?: { category_id?: number; active?: boolean; search?: string; sort_by?: string; sort_dir?: string; page?: number; page_size?: number }) =>
    api.get<Page<ProductDetail>>("/products", { params }).then((r) => r.data),
  get: (id: number) => api.get<ProductDetail>(`/products/${id}`).then((r) => r.data),
  create: (data: { name: string; sku: string; category_id: number; supplier_id: number; purchase_price: number; supplier_price?: number; current_stock?: number; minimum_stock: number; unit?: string; image_url?: string; is_active?: boolean }) =>
    api.post<ProductDetail>("/products", data).then((r) => r.data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<ProductDetail>(`/products/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/products/${id}`),
  lowStock: (threshold?: number) =>
    api.get<LowStockItem[]>("/products/low-stock", { params: { threshold } }).then((r) => r.data),
};

export const marketApi = {
  list: (active?: boolean) =>
    api.get<Market[]>("/markets", { params: active !== undefined ? { active } : {} }).then((r) => r.data),
  get: (id: number) => api.get<Market>(`/markets/${id}`).then((r) => r.data),
  create: (data: { name: string; address?: string; phone?: string; manager_name?: string; is_active?: boolean; username: string; password: string }) =>
    api.post<Market>("/markets", data).then((r) => r.data),
  update: (id: number, data: Record<string, unknown>) =>
    api.patch<Market>(`/markets/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/markets/${id}`),
  listUsers: (id: number) =>
    api.get<{ user_id: number; username: string; email: string }[]>(`/markets/${id}/users`).then((r) => r.data),
  assignUser: (marketId: number, userId: number) =>
    api.post(`/markets/${marketId}/users`, null, { params: { user_id: userId } }).then((r) => r.data),
  removeUser: (marketId: number, userId: number) =>
    api.delete(`/markets/${marketId}/users/${userId}`).then((r) => r.data),
};

export const orderApi = {
  list: (params?: { status?: string; market_id?: number; from_date?: string; to_date?: string; page?: number; page_size?: number }) =>
    api.get<Page<OrderDetail>>("/orders", { params }).then((r) => r.data),
  get: (id: number) => api.get<OrderDetail>(`/orders/${id}`).then((r) => r.data),
  create: (data: { market_id?: number; items: { product_id: number; quantity: number }[]; notes?: string }) =>
    api.post<OrderDetail>("/orders", data, { params: data.market_id ? { market_id: data.market_id } : {} }).then((r) => r.data),
  approve: (id: number) => api.post<OrderDetail>(`/orders/${id}/approve`).then((r) => r.data),
  reject: (id: number, reason?: string) =>
    api.post<OrderDetail>(`/orders/${id}/reject`, { reason }).then((r) => r.data),
};

export const purchaseApi = {
  list: () => api.get<PurchaseOrderDetail[]>("/purchases").then((r) => r.data),
  get: (id: number) => api.get<PurchaseOrderDetail>(`/purchases/${id}`).then((r) => r.data),
  create: (data: { supplier_id: number; purchase_date?: string; items: { product_id: number; quantity: number; unit_price: number }[] }) =>
    api.post<PurchaseOrderDetail>("/purchases", data).then((r) => r.data),
  receive: (id: number) => api.post<PurchaseOrderDetail>(`/purchases/${id}/receive`).then((r) => r.data),
};

export const stockApi = {
  movements: (params?: { product_id?: number; movement_type?: string; limit?: number; offset?: number }) =>
    api.get<StockMovement[]>("/stock/movements", { params }).then((r) => r.data),
  adjust: (data: { product_id: number; quantity: number; reason?: string; direction: "add" | "remove" }) =>
    api.post<StockMovement>("/stock/adjustments", data).then((r) => r.data),
  return: (data: { product_id: number; quantity: number; reason?: string }) =>
    api.post<StockMovement>("/stock/returns", data).then((r) => r.data),
};

export const analyticsApi = {
  products: (params?: { year?: number; month?: number }) =>
    api.get<ProductAnalytics>("/analytics/products", { params }).then((r) => r.data),
  markets: (params?: { year?: number; month?: number }) =>
    api.get<MarketAnalytics>("/analytics/markets", { params }).then((r) => r.data),
  dashboard: () => api.get<DashboardSummary>("/analytics/dashboard").then((r) => r.data),
  stockSummary: () => api.get("/analytics/stock-summary").then((r) => r.data),
};

export const auditLogApi = {
  list: (params?: { action?: string; entity_type?: string; user_id?: number; page?: number; page_size?: number }) =>
    api.get<Page<AuditLog>>("/audit-logs", { params }).then((r) => r.data),
};
