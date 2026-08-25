import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryApi, supplierApi, productApi, marketApi, orderApi, dashboardApi, analyticsApi, auditLogApi, stockApi, purchaseApi } from "@/api";

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: categoryApi.list });
}

export function useSuppliers() {
  return useQuery({ queryKey: ["suppliers"], queryFn: supplierApi.list });
}

export function useProducts(params?: Parameters<typeof productApi.list>[0]) {
  return useQuery({ queryKey: ["products", params], queryFn: () => productApi.list(params) });
}

export function useProduct(id: number) {
  return useQuery({ queryKey: ["product", id], queryFn: () => productApi.get(id), enabled: !!id });
}

export function useMarkets(active?: boolean) {
  return useQuery({ queryKey: ["markets", active], queryFn: () => marketApi.list(active) });
}

export function useMarket(id: number) {
  return useQuery({ queryKey: ["market", id], queryFn: () => marketApi.get(id), enabled: !!id });
}

export function useOrders(params?: Parameters<typeof orderApi.list>[0]) {
  return useQuery({ queryKey: ["orders", params], queryFn: () => orderApi.list(params) });
}

export function useOrder(id: number) {
  return useQuery({ queryKey: ["order", id], queryFn: () => orderApi.get(id), enabled: !!id });
}

export function useDashboardSummary() {
  return useQuery({ queryKey: ["dashboard-summary"], queryFn: dashboardApi.summary });
}

export function useProductAnalytics(params?: { year?: number; month?: number }) {
  return useQuery({ queryKey: ["analytics-products", params], queryFn: () => analyticsApi.products(params) });
}

export function useMarketAnalytics(params?: { year?: number; month?: number }) {
  return useQuery({ queryKey: ["analytics-markets", params], queryFn: () => analyticsApi.markets(params) });
}

export function useAuditLogs(params?: Parameters<typeof auditLogApi.list>[0]) {
  return useQuery({ queryKey: ["audit-logs", params], queryFn: () => auditLogApi.list(params) });
}

export function useStockMovements(params?: Parameters<typeof stockApi.movements>[0]) {
  return useQuery({ queryKey: ["stock-movements", params], queryFn: () => stockApi.movements(params) });
}

export function useLowStock() {
  return useQuery({ queryKey: ["low-stock"], queryFn: () => productApi.lowStock() });
}

export function usePurchases() {
  return useQuery({ queryKey: ["purchases"], queryFn: purchaseApi.list });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: productApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); qc.invalidateQueries({ queryKey: ["dashboard-summary"] }); },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => productApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: productApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); qc.invalidateQueries({ queryKey: ["dashboard-summary"] }); },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: categoryApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; description?: string } }) => categoryApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: categoryApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: supplierApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => supplierApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: supplierApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useCreateMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: marketApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["markets"] }); qc.invalidateQueries({ queryKey: ["dashboard-summary"] }); },
  });
}

export function useUpdateMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => marketApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["markets"] }); qc.invalidateQueries({ queryKey: ["dashboard-summary"] }); },
  });
}

export function useDeleteMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: marketApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["markets"] }); qc.invalidateQueries({ queryKey: ["dashboard-summary"] }); },
  });
}

export function useMarketUsers(marketId: number) {
  return useQuery({ queryKey: ["market-users", marketId], queryFn: () => marketApi.listUsers(marketId), enabled: !!marketId });
}

export function useAssignMarketUser(marketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => marketApi.assignUser(marketId, userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["market-users", marketId] }); qc.invalidateQueries({ queryKey: ["profiles"] }); },
  });
}

export function useRemoveMarketUser(marketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => marketApi.removeUser(marketId, userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["market-users", marketId] }); qc.invalidateQueries({ queryKey: ["profiles"] }); },
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orderApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders"] }); qc.invalidateQueries({ queryKey: ["dashboard-summary"] }); },
  });
}

export function useApproveOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orderApi.approve,
    onSuccess: (_data, orderId) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useRejectOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => orderApi.reject(id, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders"] }); qc.invalidateQueries({ queryKey: ["dashboard-summary"] }); },
  });
}

export function useStockAdjust() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: stockApi.adjust,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); qc.invalidateQueries({ queryKey: ["stock-movements"] }); },
  });
}

export function useStockReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: stockApi.return,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); qc.invalidateQueries({ queryKey: ["stock-movements"] }); },
  });
}
