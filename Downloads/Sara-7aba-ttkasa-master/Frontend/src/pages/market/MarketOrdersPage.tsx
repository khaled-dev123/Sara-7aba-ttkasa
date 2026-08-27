import { useState } from "react";
import { useOrders } from "@/hooks";
import { PageHeader, StatusBadge, Pagination, EmptyState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShoppingCart, Eye, Check, X } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { type OrderDetail, type OrderStatus } from "@/types";

const FLOW: OrderStatus[] = ["pending", "approved"];

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === "rejected") {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-red-600">
        <X className="h-4 w-4" /> Order was rejected
      </div>
    );
  }
  const currentIdx = FLOW.indexOf(status);
  return (
    <div className="flex items-center">
      {FLOW.map((step, idx) => {
        const done = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div key={step} className="flex items-center last:flex-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors",
                  done
                    ? isCurrent
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-green-600 bg-green-600 text-white"
                    : "border-muted-foreground/30 bg-background text-muted-foreground"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
              </div>
              <span className={cn("text-[10px] leading-none", done ? "font-medium text-foreground" : "text-muted-foreground")}>
                {step.replace("_", " ")}
              </span>
            </div>
            {idx < FLOW.length - 1 && (
              <div className={cn("mx-1 mb-4 h-0.5 flex-1", idx < currentIdx ? "bg-green-600" : "bg-muted-foreground/20")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MarketOrdersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);

  const { data, isLoading } = useOrders({ page, page_size: 20, status: statusFilter === "all" ? undefined : statusFilter });

  return (
    <div className="space-y-6">
      <PageHeader title="My Orders" description="Track the status of your orders" />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 rounded-lg border bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : !data?.items || data.items.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Place your first order from the Products page"
          icon={<ShoppingCart className="h-12 w-12" />}
        />
      ) : (
        <>
          <div className="space-y-4">
            {data.items.map((order) => (
              <Card key={order.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-mono text-base font-semibold">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(order.requested_at)} &middot; {order.items.length} product{order.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>

                  <div className="my-5 max-w-xl">
                    <OrderTimeline status={order.status} />
                  </div>

                  {order.status === "rejected" && order.notes && (
                    <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      Reason: {order.notes}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                      <Eye className="mr-2 h-4 w-4" /> View Items
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
