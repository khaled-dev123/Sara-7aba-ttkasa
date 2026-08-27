import { useState } from "react";
import { Link } from "react-router-dom";
import { useOrders, useMarkets, useApproveOrder, useRejectOrder, useOrder } from "@/hooks";
import { type OrderDetail } from "@/types";
import { PageHeader, StatusBadge, Pagination, TableSkeleton, EmptyState, useToast } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ShoppingCart, Search, CheckCircle, XCircle, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [marketFilter, setMarketFilter] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const { data, isLoading } = useOrders({
    page,
    page_size: 20,
    status: statusFilter || undefined,
    market_id: marketFilter ? Number(marketFilter) : undefined,
  });
  const { data: markets } = useMarkets();
  const approveMutation = useApproveOrder();
  const rejectMutation = useRejectOrder();
  const { addToast } = useToast();

  const handleApprove = async (id: number) => {
    try {
      await approveMutation.mutateAsync({ id });
      addToast({ title: "Order approved" });
    } catch (err: any) {
      addToast({ title: "Error", description: err?.response?.data?.detail || "Failed", variant: "destructive" });
    }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    try {
      await rejectMutation.mutateAsync({ id: rejectId, reason: rejectReason });
      addToast({ title: "Order rejected" });
    } catch (err: any) {
      addToast({ title: "Error", description: err?.response?.data?.detail || "Failed", variant: "destructive" });
    }
    setRejectId(null);
    setRejectReason("");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description="Manage customer orders" />

      <div className="flex flex-col gap-4 sm:flex-row">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {["pending", "approved", "rejected"].map((s) => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={marketFilter} onValueChange={(v) => { setMarketFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Markets" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Markets</SelectItem>
            {markets?.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <TableSkeleton rows={5} cols={6} /> : !data?.items || data.items.length === 0 ? (
        <EmptyState title="No orders found" description="Orders will appear here" icon={<ShoppingCart className="h-12 w-12" />} />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
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
                {data.items.map((order) => (
                  <>
                    <TableRow key={order.id} className="cursor-pointer" onClick={() => setExpandedRow(expandedRow === order.id ? null : order.id)}>
                      <TableCell>
                        {expandedRow === order.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="font-medium font-mono"><Link to={`/admin/orders/${order.id}`} className="hover:underline">{order.order_number}</Link></TableCell>
                      <TableCell>{order.market_name}</TableCell>
                      <TableCell>{formatDate(order.requested_at)}</TableCell>
                      <TableCell>{order.items.length} products</TableCell>
                      <TableCell><StatusBadge status={order.status} /></TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedOrder(order)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {order.status === "pending" && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-600" onClick={() => handleApprove(order.id)}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-600" onClick={() => setRejectId(order.id)}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedRow === order.id && (
                      <TableRow key={`${order.id}-details`}>
                        <TableCell colSpan={7} className="bg-muted/30">
                          <div className="py-2 space-y-1">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-sm">
                                <span>{item.product_name} ({item.sku})</span>
                                <span className="font-medium">{item.quantity} {item.unit || "pcs"}</span>
                              </div>
                            ))}
                            {order.notes && <p className="text-sm text-muted-foreground mt-2 italic">Notes: {order.notes}</p>}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />
        </>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order {selectedOrder?.order_number}</DialogTitle>
            <DialogDescription>Order details and items</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Market:</span>
                  <p className="font-medium">{selectedOrder.market_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="mt-1"><StatusBadge status={selectedOrder.status} /></div>
                </div>
                <div>
                  <span className="text-muted-foreground">Requested:</span>
                  <p className="font-medium">{formatDateTime(selectedOrder.requested_at)}</p>
                </div>
                {selectedOrder.approved_at && (
                  <div>
                    <span className="text-muted-foreground">Approved:</span>
                    <p className="font-medium">{formatDateTime(selectedOrder.approved_at)}</p>
                  </div>
                )}
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {selectedOrder.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Notes:</span>
                  <p className="mt-1">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectId !== null} onOpenChange={(open) => { if (!open) { setRejectId(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this order (optional)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Rejection reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending}>Reject Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
