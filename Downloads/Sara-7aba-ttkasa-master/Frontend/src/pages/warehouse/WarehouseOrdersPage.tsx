import { useOrders } from "@/hooks";
import { PageHeader, TableSkeleton, StatusBadge } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export default function WarehouseOrdersPage() {
  const { data: approvedData, isLoading: approvedLoading } = useOrders({ status: "approved", page_size: 100 });

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description="Approved orders ready for dispatch" />

      <Card>
        <CardContent className="p-0">
          {approvedLoading ? (
            <div className="p-6"><TableSkeleton rows={3} cols={4} /></div>
          ) : !approvedData?.items || approvedData.items.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">No approved orders</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedData.items.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>{order.market_name || "-"}</TableCell>
                    <TableCell>{formatDate(order.requested_at)}</TableCell>
                    <TableCell>{order.items.length} items</TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
