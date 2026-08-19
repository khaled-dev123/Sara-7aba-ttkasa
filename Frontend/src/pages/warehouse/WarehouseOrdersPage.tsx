import { Link } from "react-router-dom";
import { useOrders, usePrepareOrder, useStartDelivery } from "@/hooks";
import { PageHeader, TableSkeleton, StatusBadge, useToast } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Truck } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function WarehouseOrdersPage() {
  const { data: approvedData, isLoading: approvedLoading } = useOrders({ status: "approved", page_size: 100 });
  const { data: preparedData, isLoading: preparedLoading } = useOrders({ status: "prepared", page_size: 100 });
  const prepareMutation = usePrepareOrder();
  const startDeliveryMutation = useStartDelivery();
  const { addToast } = useToast();

  const handlePrepare = async (id: number) => {
    try {
      await prepareMutation.mutateAsync(id);
      addToast({ title: "Order marked as prepared" });
    } catch (err: any) {
      addToast({ title: "Error", description: err?.response?.data?.detail || "Failed", variant: "destructive" });
    }
  };

  const handleStartDelivery = async (id: number) => {
    try {
      await startDeliveryMutation.mutateAsync(id);
      addToast({ title: "Delivery started" });
    } catch (err: any) {
      addToast({ title: "Error", description: err?.response?.data?.detail || "Failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description="Manage order preparation and delivery" />

      <Tabs defaultValue="prep">
        <TabsList>
          <TabsTrigger value="prep">Preparation Queue ({approvedData?.total || 0})</TabsTrigger>
          <TabsTrigger value="delivery">Delivery Queue ({preparedData?.total || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="prep">
          <Card>
            <CardContent className="p-0">
              {approvedLoading ? (
                <div className="p-6"><TableSkeleton rows={3} cols={4} /></div>
              ) : !approvedData?.items || approvedData.items.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-muted-foreground">No orders to prepare</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Market</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedData.items.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell>{order.market_name || "-"}</TableCell>
                        <TableCell>{formatDate(order.requested_at)}</TableCell>
                        <TableCell>{order.items.length} items</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" onClick={() => handlePrepare(order.id)} disabled={prepareMutation.isPending}>
                              <Package className="mr-1 h-3 w-3" /> Prepare
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery">
          <Card>
            <CardContent className="p-0">
              {preparedLoading ? (
                <div className="p-6"><TableSkeleton rows={3} cols={4} /></div>
              ) : !preparedData?.items || preparedData.items.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-muted-foreground">No orders ready for delivery</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Market</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preparedData.items.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell>{order.market_name || "-"}</TableCell>
                        <TableCell>{formatDate(order.requested_at)}</TableCell>
                        <TableCell>{order.items.length} items</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => handleStartDelivery(order.id)} disabled={startDeliveryMutation.isPending}>
                            <Truck className="mr-1 h-3 w-3" /> Start Delivery
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
