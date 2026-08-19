import { useState } from "react";
import { Link } from "react-router-dom";
import { useDeliveries, useStartDelivery, useCompleteDelivery } from "@/hooks";
import { deliveryApi } from "@/api";
import type { DeliveryDetail } from "@/types";
import { PageHeader, StatusBadge, TableSkeleton, EmptyState, useToast } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ClipboardList, Download, Eye, Truck, CheckCircle } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

export default function DeliveriesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryDetail | null>(null);

  const { data: deliveries, isLoading } = useDeliveries({ status: statusFilter || undefined });
  const startMutation = useStartDelivery();
  const completeMutation = useCompleteDelivery();
  const { addToast } = useToast();

  const handleStart = async (id: number) => {
    try { await startMutation.mutateAsync(id); addToast({ title: "Delivery started" }); }
    catch (err: any) { addToast({ title: "Error", description: err?.response?.data?.detail || "Failed", variant: "destructive" }); }
  };

  const handleComplete = async (id: number) => {
    try { await completeMutation.mutateAsync(id); addToast({ title: "Delivery completed" }); }
    catch (err: any) { addToast({ title: "Error", description: err?.response?.data?.detail || "Failed", variant: "destructive" }); }
  };

  const downloadPdf = (id: number) => {
    const url = deliveryApi.pdfUrl(id);
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.download = `delivery-${id}.pdf`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Deliveries" description="Track and manage deliveries" />

      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="prepared">Prepared</SelectItem>
          <SelectItem value="on_route">On Route</SelectItem>
          <SelectItem value="delivered">Delivered</SelectItem>
        </SelectContent>
      </Select>

      {isLoading ? <TableSkeleton rows={5} cols={6} /> : !deliveries || deliveries.length === 0 ? (
        <EmptyState title="No deliveries" description="Deliveries will appear here" icon={<ClipboardList className="h-12 w-12" />} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono font-medium"><Link to={`/admin/deliveries/${d.id}`} className="hover:underline">{d.order_number || `#${d.id}`}</Link></TableCell>
                  <TableCell>{d.market_name}</TableCell>
                  <TableCell>{formatDate(d.delivery_date)}</TableCell>
                  <TableCell>{d.items.length} products</TableCell>
                  <TableCell><StatusBadge status={d.status} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDelivery(d)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {d.status === "prepared" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-600" onClick={() => handleStart(d.id)}>
                          <Truck className="h-4 w-4" />
                        </Button>
                      )}
                      {d.status === "on_route" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-600" onClick={() => handleComplete(d.id)}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadPdf(d.id)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!selectedDelivery} onOpenChange={(open) => { if (!open) setSelectedDelivery(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Delivery Details</DialogTitle>
            <DialogDescription>Delivery for order {selectedDelivery?.order_number}</DialogDescription>
          </DialogHeader>
          {selectedDelivery && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Market:</span>
                  <p className="font-medium">{selectedDelivery.market_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="mt-1"><StatusBadge status={selectedDelivery.status} /></div>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium">{formatDateTime(selectedDelivery.delivery_date)}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Delivery Timeline</h4>
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 text-sm ${["prepared", "on_route", "delivered"].indexOf(selectedDelivery.status) >= 0 ? "text-green-600" : "text-muted-foreground"}`}>
                    <div className={`h-2 w-2 rounded-full ${["prepared", "on_route", "delivered"].indexOf(selectedDelivery.status) >= 0 ? "bg-green-600" : "bg-muted"}`} />
                    Prepared
                  </div>
                  <div className={`flex items-center gap-2 text-sm ${["on_route", "delivered"].indexOf(selectedDelivery.status) >= 0 ? "text-green-600" : "text-muted-foreground"}`}>
                    <div className={`h-2 w-2 rounded-full ${["on_route", "delivered"].indexOf(selectedDelivery.status) >= 0 ? "bg-green-600" : "bg-muted"}`} />
                    On Route
                  </div>
                  <div className={`flex items-center gap-2 text-sm ${selectedDelivery.status === "delivered" ? "text-green-600" : "text-muted-foreground"}`}>
                    <div className={`h-2 w-2 rounded-full ${selectedDelivery.status === "delivered" ? "bg-green-600" : "bg-muted"}`} />
                    Delivered
                  </div>
                </div>
              </div>

              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium mb-2">Items ({selectedDelivery.items.length})</p>
                {selectedDelivery.items.map((item) => (
                  <div key={item.id} className="flex justify-between py-1">
                    <span>Product #{item.product_id}</span>
                    <span className="font-medium">x{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
