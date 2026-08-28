import { useParams, Link } from "react-router-dom";
import { useOrder, useApproveOrder, useRejectOrder } from "@/hooks";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, PageSkeleton, StatusBadge } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timeline } from "@/components/ui/timeline";
import { ArrowLeft, Check, X, Package, AlertTriangle, Store, TrendingDown } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const { data: order, isLoading } = useOrder(orderId);
  const { user } = useAuth();
  const approveMutation = useApproveOrder();
  const rejectMutation = useRejectOrder();
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  if (isLoading) return <PageSkeleton />;
  if (!order) return <div className="p-8 text-center text-muted-foreground">Order not found</div>;

  const timelineSteps = [
    { label: "Order Placed", status: "completed" as const, timestamp: formatDateTime(order.requested_at) },
    order.status === "rejected"
      ? { label: "Rejected", status: "error" as const }
      : {
          label: "Approved",
          status: (order.approved_at ? "completed" : "pending") as "completed" | "pending",
          timestamp: order.approved_at ? formatDateTime(order.approved_at) : undefined,
          description: order.approved_by_username ? `by ${order.approved_by_username}` : undefined,
        },
  ];

  const [approveOpen, setApproveOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [deliverQuantities, setDeliverQuantities] = useState<Record<number, number>>(() =>
    Object.fromEntries(order.items.map((it) => [it.product_id, Math.min(it.quantity, it.current_stock ?? 0)]))
  );

  const stockWarningItems = order.items.filter((item) => {
    const selectedQty = deliverQuantities[item.product_id] ?? 0;
    const availableQty = item.current_stock ?? 0;
    return availableQty > 0 && selectedQty >= availableQty;
  });

  const openApproveModal = () => {
    setDeliverQuantities(Object.fromEntries(order.items.map((it) => [it.product_id, Math.min(it.quantity, it.current_stock ?? 0)])));
    setApproveOpen(true);
  };

  const finalApprove = async () => {
    const payloadItems = order.items.map((item) => ({
      product_id: item.product_id,
      quantity: Math.max(0, Number(deliverQuantities[item.product_id] ?? 0)),
    }));
    await approveMutation.mutateAsync({ id: orderId, payload: { items: payloadItems } });
    setApproveOpen(false);
    setWarningOpen(false);
  };

  const handleApproveConfirm = async () => {
    const finalQtySelected = stockWarningItems.length > 0;
    if (finalQtySelected) {
      setWarningOpen(true);
      return;
    }
    await finalApprove();
  };

  const handleQtyChange = (product_id: number, value: number) => {
    setDeliverQuantities((prev) => ({ ...prev, [product_id]: value }));
  };

  const handleReject = async () => {
    await rejectMutation.mutateAsync({ id: orderId, reason: rejectReason });
    setShowReject(false);
    setRejectReason("");
  };

  const isApproved = order.status === "approved";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/orders"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <PageHeader
          title={`Order ${order.order_number}`}
          description={`${order.market_name || "Unknown Market"} - ${formatDateTime(order.requested_at)}`}
          actions={
            <StatusBadge status={order.status} />
          }
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* ── Ordered Products Table ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Ordered Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qty Ordered</TableHead>
                    <TableHead>Unit</TableHead>
                    {isApproved && (
                      <TableHead className="text-right">Stock Remaining</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => {
                    const isLow =
                      isApproved &&
                      item.current_stock !== null &&
                      item.minimum_stock !== null &&
                      item.current_stock <= item.minimum_stock;

                    return (
                      <TableRow key={item.id} className={isLow ? "bg-destructive/5" : undefined}>
                        <TableCell className="font-medium">
                          {item.product_name || `Product #${item.product_id}`}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.sku || "-"}</TableCell>
                        <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                        <TableCell>{item.unit || "-"}</TableCell>
                        {isApproved && (
                          <TableCell className="text-right">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                isLow ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {isLow && <AlertTriangle className="h-3.5 w-3.5" />}
                              {item.current_stock ?? "—"}
                              {item.unit ? ` ${item.unit}` : ""}
                            </span>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* ── Post-Approval Stock Summary Card ── */}
          {isApproved && (
            <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <TrendingDown className="h-5 w-5" />
                  Stock Levels After Approval
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {order.items.map((item) => {
                    const isLow =
                      item.current_stock !== null &&
                      item.minimum_stock !== null &&
                      item.current_stock <= item.minimum_stock;

                    const pct =
                      item.minimum_stock && item.minimum_stock > 0
                        ? Math.min(100, Math.round(((item.current_stock ?? 0) / (item.minimum_stock * 3)) * 100))
                        : 100;

                    return (
                      <div
                        key={item.id}
                        className={`rounded-lg border p-3 space-y-2 ${
                          isLow
                            ? "border-destructive/40 bg-destructive/5"
                            : "border-border bg-background"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">
                            {item.product_name || `Product #${item.product_id}`}
                          </span>
                          {isLow && (
                            <span className="flex items-center gap-1 text-xs text-destructive font-semibold shrink-0 ml-2">
                              <AlertTriangle className="h-3 w-3" /> Low Stock
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Delivered: <strong className="text-foreground">{item.quantity}</strong></span>
                          <span>Remaining: <strong className={isLow ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}>{item.current_stock ?? "—"}</strong></span>
                          <span>Min: <strong className="text-foreground">{item.minimum_stock ?? "—"}</strong></span>
                        </div>
                        {/* Stock bar */}
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isLow ? "bg-destructive" : "bg-emerald-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {order.notes && (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{order.notes}</p></CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Status Timeline</CardTitle></CardHeader>
            <CardContent>
              <Timeline steps={timelineSteps} />
            </CardContent>
          </Card>

          {/* ── Market Info ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                Market Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Market</dt>
                  <dd className="font-medium">{order.market_name || "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="font-medium">{order.market_phone || "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total Items</dt>
                  <dd className="font-medium">{order.items.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total Qty</dt>
                  <dd className="font-medium">
                    {order.items.reduce((sum, i) => sum + i.quantity, 0)}
                  </dd>
                </div>
              </dl>

              {/* Per-product summary for market */}
              {order.items.length > 0 && (
                <div className="mt-4 pt-4 border-t space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    What {order.market_name || "Market"} ordered
                  </p>
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[140px]">
                        {item.product_name || `Product #${item.product_id}`}
                      </span>
                      <span className="font-semibold shrink-0 ml-2">
                        {item.quantity} {item.unit || ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {user?.role === "admin" && order.status === "pending" && (
            <Card>
              <CardHeader><CardTitle>Admin Actions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  onClick={openApproveModal}
                  disabled={approveMutation.isPending}
                >
                  <Check className="mr-2 h-4 w-4" /> Approve Order
                </Button>
                {!showReject ? (
                  <Button variant="destructive" className="w-full" onClick={() => setShowReject(true)}>
                    <X className="mr-2 h-4 w-4" /> Reject Order
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={handleReject}
                        disabled={rejectMutation.isPending}
                      >
                        Confirm Reject
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={() => setShowReject(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Approve modal */}
          <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Partial delivery approval</DialogTitle>
                <DialogDescription>Enter how many units to deliver for each product. This order will remain approved; no pending backorder will be created.</DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium truncate">{item.product_name}</div>
                      <div className="text-xs text-muted-foreground">Requested: {item.quantity} • Available: {item.current_stock ?? 0}</div>
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        min={0}
                        max={Math.max(item.quantity, item.current_stock ?? 0)}
                        value={deliverQuantities[item.product_id] ?? 0}
                        onChange={(e) => handleQtyChange(item.product_id, Number(e.target.value))}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
                <Button onClick={handleApproveConfirm} disabled={approveMutation.isPending}>Confirm & Approve</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={warningOpen} onOpenChange={setWarningOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Final stock warning</DialogTitle>
                <DialogDescription>
                  This approval will use the last available stock for {stockWarningItems.length > 0 ? stockWarningItems.map((item) => item.product_name || `Product #${item.product_id}`).join(", ") : "the selected items"}. Please confirm that this is intentional before proceeding.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setWarningOpen(false)}>Cancel</Button>
                <Button onClick={finalApprove} disabled={approveMutation.isPending}>Proceed with approval</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
