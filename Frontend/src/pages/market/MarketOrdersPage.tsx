import { useState } from "react";
import { useOrders } from "@/hooks";
import { PageHeader, StatusBadge, Pagination, TableSkeleton, EmptyState, useToast } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShoppingCart, Eye } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { type OrderDetail } from "@/types";
import { deliveryApi } from "@/api";

export default function MarketOrdersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);

  const { data, isLoading } = useOrders({ page, page_size: 20, status: statusFilter || undefined });
  const { addToast } = useToast();

  const downloadPdf = (deliveryId: number) => {
    const a = document.createElement("a");
    a.href = deliveryApi.pdfUrl(deliveryId);
    a.target = "_blank";
    a.download = `delivery-${deliveryId}.pdf`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Orders" description="Track your order history" />

      <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {["pending", "approved", "prepared", "on_route", "delivered", "rejected"].map((s) => (
            <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading ? <TableSkeleton rows={5} cols={5} /> : !data?.items || data.items.length === 0 ? (
        <EmptyState title="No orders yet" description="Place your first order from the Products page" icon={<ShoppingCart className="h-12 w-12" />} />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                    <TableCell>{formatDate(order.requested_at)}</TableCell>
                    <TableCell>{order.items.length} products</TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedOrder(order)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {order.delivery_id && order.status === "delivered" && (
                          <Button variant="ghost" size="sm" onClick={() => downloadPdf(order.delivery_id!)}>
                            PDF
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />
        </>
      )}

      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order {selectedOrder?.order_number}</DialogTitle>
            <DialogDescription>{formatDateTime(selectedOrder?.requested_at || "")}</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <StatusBadge status={selectedOrder.status} />
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
                <p className="text-sm text-muted-foreground">Notes: {selectedOrder.notes}</p>
              )}
              {selectedOrder.delivery_id && selectedOrder.status === "delivered" && (
                <Button onClick={() => downloadPdf(selectedOrder.delivery_id!)} className="w-full">
                  Download Delivery PDF
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
