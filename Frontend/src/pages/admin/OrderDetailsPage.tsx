import { useParams, Link } from "react-router-dom";
import { useOrder, useApproveOrder, useRejectOrder, usePrepareOrder, useStartDelivery } from "@/hooks";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, PageSkeleton, StatusBadge } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timeline } from "@/components/ui/timeline";
import { ArrowLeft, Check, X, Package, Truck } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { useState } from "react";

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const { data: order, isLoading } = useOrder(orderId);
  const { user } = useAuth();
  const approveMutation = useApproveOrder();
  const rejectMutation = useRejectOrder();
  const prepareMutation = usePrepareOrder();
  const startDeliveryMutation = useStartDelivery();
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  if (isLoading) return <PageSkeleton />;
  if (!order) return <div className="p-8 text-center text-muted-foreground">Order not found</div>;

  const timelineSteps = [
    { label: "Order Placed", status: "completed" as const, timestamp: formatDateTime(order.requested_at) },
    { label: "Approved", status: order.approved_at ? "completed" as const : order.status === "rejected" ? "error" as const : "pending" as const, timestamp: order.approved_at ? formatDateTime(order.approved_at) : undefined, description: order.approved_by_username ? `by ${order.approved_by_username}` : undefined },
    { label: "Prepared", status: ["prepared", "on_route", "delivered"].includes(order.status) ? "completed" as const : order.status === "pending" ? "pending" as const : "pending" as const },
    { label: "On Route", status: ["on_route", "delivered"].includes(order.status) ? "completed" as const : "pending" as const },
    { label: "Delivered", status: order.status === "delivered" ? "completed" as const : "pending" as const },
  ];

  const handleApprove = async () => {
    await approveMutation.mutateAsync(orderId);
  };

  const handleReject = async () => {
    await rejectMutation.mutateAsync({ id: orderId, reason: rejectReason });
    setShowReject(false);
    setRejectReason("");
  };

  const handlePrepare = async () => {
    await prepareMutation.mutateAsync(orderId);
  };

  const handleStartDelivery = async () => {
    await startDeliveryMutation.mutateAsync(orderId);
  };

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
          <Card>
            <CardHeader><CardTitle>Ordered Products</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product_name || `Product #${item.product_id}`}</TableCell>
                      <TableCell className="font-mono text-sm">{item.sku || "-"}</TableCell>
                      <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                      <TableCell>{item.unit || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

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

          <Card>
            <CardHeader><CardTitle>Market Information</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Market</dt><dd className="font-medium">{order.market_name || "-"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Phone</dt><dd className="font-medium">{order.market_phone || "-"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Delivery ID</dt><dd className="font-medium">{order.delivery_id || "-"}</dd></div>
              </dl>
            </CardContent>
          </Card>

          {user?.role === "admin" && order.status === "pending" && (
            <Card>
              <CardHeader><CardTitle>Admin Actions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" onClick={handleApprove} disabled={approveMutation.isPending}>
                  <Check className="mr-2 h-4 w-4" /> Approve Order
                </Button>
                {!showReject ? (
                  <Button variant="destructive" className="w-full" onClick={() => setShowReject(true)}>
                    <X className="mr-2 h-4 w-4" /> Reject Order
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection" />
                    <div className="flex gap-2">
                      <Button variant="destructive" className="flex-1" onClick={handleReject} disabled={rejectMutation.isPending}>
                        Confirm Reject
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={() => setShowReject(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {user?.role === "warehouse" && order.status === "approved" && (
            <Card>
              <CardHeader><CardTitle>Warehouse Actions</CardTitle></CardHeader>
              <CardContent>
                <Button className="w-full" onClick={handlePrepare} disabled={prepareMutation.isPending}>
                  <Package className="mr-2 h-4 w-4" /> Mark as Prepared
                </Button>
              </CardContent>
            </Card>
          )}

          {user?.role === "warehouse" && order.status === "prepared" && (
            <Card>
              <CardHeader><CardTitle>Delivery Actions</CardTitle></CardHeader>
              <CardContent>
                <Button className="w-full" onClick={handleStartDelivery} disabled={startDeliveryMutation.isPending}>
                  <Truck className="mr-2 h-4 w-4" /> Start Delivery
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
