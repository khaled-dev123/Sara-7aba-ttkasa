import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useOrders, useMarkets, useProducts, useApproveOrder, useRejectOrder, useCreateOrder } from "@/hooks";
import { type OrderDetail, type ProductDetail } from "@/types";
import { StatusBadge, Pagination, TableSkeleton, EmptyState, useToast, ConfirmDialog } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { ShoppingCart, Search, CheckCircle, XCircle, Eye, ChevronDown, ChevronUp, Filter, RefreshCw, Plus, Trash2 } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

interface OrdersManagementViewProps {
  initialSearch?: string;
  initialStatus?: string;
  productIdFilter?: number;
  productNameFilter?: string;
  onClearProductFilter?: () => void;
}

interface NewOrderItem {
  product: ProductDetail;
  quantity: number;
}

function CreateOrderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: markets } = useMarkets(true);
  const { data: productsData } = useProducts({ page: 1, page_size: 100 });
  const createOrder = useCreateOrder();
  const { addToast } = useToast();

  const [selectedMarketId, setSelectedMarketId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<NewOrderItem[]>([]);

  const products = (productsData?.items ?? []).filter((p) => p.is_active);

  const handleAddItem = () => {
    if (!selectedProductId) return;
    const p = products.find((prod) => prod.id === Number(selectedProductId));
    if (!p) return;

    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === p.id);
      if (existing) {
        return prev.map((i) => i.product.id === p.id ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { product: p, quantity: qty }];
    });

    setSelectedProductId("");
    setQty(1);
  };

  const handleRemoveItem = (productId: number) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const handleSubmit = async () => {
    if (!selectedMarketId) {
      addToast({ title: "Validation Error", description: "Please select a target market", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      addToast({ title: "Validation Error", description: "Please add at least one product to the order", variant: "destructive" });
      return;
    }

    try {
      await createOrder.mutateAsync({
        market_id: Number(selectedMarketId),
        items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        notes,
      });
      addToast({ title: "Order Created", description: "Customer order has been created successfully." });
      setItems([]);
      setSelectedMarketId("");
      setNotes("");
      onClose();
    } catch (err: any) {
      addToast({ title: "Error Creating Order", description: err?.response?.data?.detail || "Failed to create order", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Create Customer Order
          </DialogTitle>
          <DialogDescription>Place a new order for a specific market</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Target Market */}
          <div className="space-y-1.5">
            <Label>Target Market</Label>
            <Select value={selectedMarketId} onValueChange={setSelectedMarketId}>
              <SelectTrigger>
                <SelectValue placeholder="Select target market..." />
              </SelectTrigger>
              <SelectContent>
                {markets?.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Add Product Line */}
          <div className="rounded-lg border p-3 bg-muted/20 space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">Add Product Item</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Choose product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name} ({p.current_stock} {p.unit} in stock)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                  className="w-20 text-xs font-bold text-center"
                />
                <Button size="sm" type="button" onClick={handleAddItem} disabled={!selectedProductId} className="flex-1">
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </div>
          </div>

          {/* Items List Table */}
          {items.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.product.id}>
                      <TableCell className="font-medium text-sm">{item.product.name}</TableCell>
                      <TableCell className="text-right font-bold text-sm">
                        {item.quantity} <span className="text-xs font-normal text-muted-foreground">{item.product.unit}</span>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleRemoveItem(item.product.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Input
              placeholder="e.g. Special delivery request..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createOrder.isPending || !selectedMarketId || items.length === 0}>
            {createOrder.isPending ? "Creating..." : "Submit Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OrdersManagementView({
  initialSearch = "",
  initialStatus = "",
  productIdFilter,
  productNameFilter,
  onClearProductFilter,
}: OrdersManagementViewProps) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [marketFilter, setMarketFilter] = useState<string>("");
  const [search, setSearch] = useState(initialSearch);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const { data, isLoading, refetch, isFetching } = useOrders({
    page,
    page_size: 20,
    status: statusFilter || undefined,
    market_id: marketFilter ? Number(marketFilter) : undefined,
  });
  const { data: markets } = useMarkets();
  const approveMutation = useApproveOrder();
  const rejectMutation = useRejectOrder();
  const { addToast } = useToast();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmOrder, setConfirmOrder] = useState<OrderDetail | null>(null);

  const doApprove = async (id: number) => {
    try {
      await approveMutation.mutateAsync({ id });
      addToast({ title: "Order approved successfully", description: `Order #${id} has been approved and stock was updated.` });
    } catch (err: any) {
      addToast({ title: "Approval Failed", description: err?.response?.data?.detail || "Failed to approve order", variant: "destructive" });
    }
  };

  const handleApprove = async (order: OrderDetail) => {
    // check if approving will deplete any product stock
    const willDeplete = order.items.some((item) => (item.current_stock ?? 0) === item.quantity && item.quantity > 0);
    if (willDeplete) {
      setConfirmOrder(order);
      setConfirmOpen(true);
      return;
    }
    await doApprove(order.id);
  };

  const handleReject = async () => {
    if (!rejectId) return;
    try {
      await rejectMutation.mutateAsync({ id: rejectId, reason: rejectReason });
      addToast({ title: "Order rejected", description: `Order #${rejectId} has been rejected.` });
    } catch (err: any) {
      addToast({ title: "Rejection Failed", description: err?.response?.data?.detail || "Failed to reject order", variant: "destructive" });
    }
    setRejectId(null);
    setRejectReason("");
  };

  // Filter items client-side by search query or productIdFilter if provided
  const rawItems = data?.items ?? [];
  const filteredItems = rawItems.filter((order) => {
    if (productIdFilter) {
      const containsProduct = order.items.some((item) => item.product_id === productIdFilter);
      if (!containsProduct) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchOrderNum = order.order_number.toLowerCase().includes(q);
      const matchMarket = order.market_name?.toLowerCase().includes(q);
      const matchItem = order.items.some((i) => i.product_name?.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q));
      if (!matchOrderNum && !matchMarket && !matchItem) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Active Product Filter Banner */}
      {productIdFilter && productNameFilter && (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <span>Showing orders containing product: <strong className="font-semibold">{productNameFilter}</strong></span>
          </div>
          {onClearProductFilter && (
            <Button size="sm" variant="ghost" onClick={onClearProductFilter} className="h-7 text-xs">
              Clear filter
            </Button>
          )}
        </div>
      )}

      {/* Filters & Actions Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search order #, market, or product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={marketFilter} onValueChange={(v) => { setMarketFilter(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Markets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Markets</SelectItem>
              {markets?.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateModalOpen(true)} size="sm" className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" />
            New Order
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5 shrink-0">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <TableSkeleton rows={5} cols={7} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="No orders found"
          description={productIdFilter ? "No orders include this product." : "No orders match the selected filters."}
          icon={<ShoppingCart className="h-12 w-12" />}
        />
      ) : (
        <Card className="border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-8"></TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((order) => (
                <React.Fragment key={order.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => setExpandedRow(expandedRow === order.id ? null : order.id)}
                  >
                    <TableCell>
                      {expandedRow === order.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </TableCell>
                    <TableCell className="font-medium font-mono">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="hover:underline text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {order.order_number}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{order.market_name || "-"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(order.requested_at)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                        {order.items.length} product{order.items.length > 1 ? "s" : ""}
                      </span>
                    </TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedOrder(order)}
                          title="View order details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {order.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleApprove(order)}
                              disabled={approveMutation.isPending}
                              title="Approve order"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setRejectId(order.id)}
                              disabled={rejectMutation.isPending}
                              title="Reject order"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedRow === order.id && (
                    <TableRow key={`${order.id}-details`}>
                      <TableCell colSpan={7} className="bg-muted/20 p-4">
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order Items</p>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {order.items.map((item) => (
                              <div key={item.id} className="rounded-lg border bg-background p-2.5 text-xs flex justify-between items-center">
                                <div>
                                  <p className="font-medium text-foreground">{item.product_name}</p>
                                  <p className="text-muted-foreground font-mono">{item.sku}</p>
                                </div>
                                <span className="font-bold text-sm bg-muted px-2 py-1 rounded">
                                  {item.quantity} {item.unit || "pcs"}
                                </span>
                              </div>
                            ))}
                          </div>
                          {order.notes && (
                            <p className="text-xs text-muted-foreground italic border-t pt-2 mt-2">
                              <strong>Notes:</strong> {order.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {data && <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />}

      {/* Order Detail Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Order {selectedOrder?.order_number}</span>
              {selectedOrder && <StatusBadge status={selectedOrder.status} />}
            </DialogTitle>
            <DialogDescription>Customer order items & status overview</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-3 rounded-lg border">
                <div>
                  <span className="text-muted-foreground text-xs">Market Name:</span>
                  <p className="font-semibold">{selectedOrder.market_name || "N/A"}</p>
                  {selectedOrder.market_phone && <p className="text-xs text-muted-foreground">📞 {selectedOrder.market_phone}</p>}
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Requested Date:</span>
                  <p className="font-semibold">{formatDateTime(selectedOrder.requested_at)}</p>
                </div>
                {selectedOrder.approved_at && (
                  <div>
                    <span className="text-muted-foreground text-xs">Approved Date:</span>
                    <p className="font-semibold">{formatDateTime(selectedOrder.approved_at)}</p>
                  </div>
                )}
                {selectedOrder.approved_by_username && (
                  <div>
                    <span className="text-muted-foreground text-xs">Processed By:</span>
                    <p className="font-semibold">{selectedOrder.approved_by_username}</p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                        <TableCell className="text-right font-bold">{item.quantity} <span className="text-xs font-normal text-muted-foreground">{item.unit || "pcs"}</span></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedOrder.notes && (
                <div className="text-xs rounded-lg border bg-muted/20 p-3">
                  <span className="font-semibold text-muted-foreground">Notes:</span>
                  <p className="mt-1">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            {selectedOrder?.status === "pending" && (
              <div className="flex gap-2 w-full justify-end">
                <Button
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    const id = selectedOrder.id;
                    setSelectedOrder(null);
                    setRejectId(id);
                  }}
                >
                  Reject Order
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                  if (selectedOrder) handleApprove(selectedOrder);
                    setSelectedOrder(null);
                  }}
                >
                  Approve Order
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={rejectId !== null} onOpenChange={(open) => { if (!open) { setRejectId(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this order (optional)</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input placeholder="e.g. Out of stock, invalid request..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending}>Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog for final-stock approvals */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setConfirmOrder(null);
        }}
        title={"Approving will deplete stock"}
        description={
          confirmOrder
            ? `Approving order #${confirmOrder.order_number} will fully deplete stock for: ${confirmOrder.items
                .filter((i) => (i.current_stock ?? 0) === i.quantity)
                .map((i) => `${i.product_name} (${i.quantity} ${i.unit || "pcs"})`)
                .join(", ")}. Are you sure you want to proceed?`
            : "This action will deplete stock for some products."
        }
        onConfirm={async () => {
          if (!confirmOrder) return;
          await doApprove(confirmOrder.id);
          setConfirmOpen(false);
          setConfirmOrder(null);
        }}
        variant="danger"
      />

      {/* Create Order Modal */}
      <CreateOrderModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </div>
  );
}
