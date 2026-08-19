import { useParams, Link } from "react-router-dom";
import { useMarket, useOrders } from "@/hooks";
import { PageHeader, PageSkeleton, StatusBadge } from "@/components/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function MarketDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const marketId = Number(id);
  const { data: market, isLoading } = useMarket(marketId);
  const { data: ordersData } = useOrders({ market_id: marketId, page_size: 50 });

  if (isLoading) return <PageSkeleton />;
  if (!market) return <div className="p-8 text-center text-muted-foreground">Market not found</div>;

  const statusCounts = ordersData?.items?.reduce((acc: Record<string, number>, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {}) || {};

  const monthlyData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1).replace("_", " "),
    count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/markets"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <PageHeader title={market.name} description={market.manager_name ? `Manager: ${market.manager_name}` : undefined} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Address</CardTitle></CardHeader>
          <CardContent><p className="font-medium">{market.address || "-"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Phone</CardTitle></CardHeader>
          <CardContent><p className="font-medium">{market.phone || "-"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Status</CardTitle></CardHeader>
          <CardContent>
            <StatusBadge status={market.is_active ? "delivered" : "rejected"} />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="info">Information</TabsTrigger>
          <TabsTrigger value="orders">Order History</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader><CardTitle>Market Information</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div><dt className="text-sm text-muted-foreground">Name</dt><dd className="font-medium">{market.name}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Manager</dt><dd className="font-medium">{market.manager_name || "-"}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Address</dt><dd className="font-medium">{market.address || "-"}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Phone</dt><dd className="font-medium">{market.phone || "-"}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Active</dt><dd className="font-medium">{market.is_active ? "Yes" : "No"}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Created</dt><dd className="font-medium">{formatDateTime(market.created_at)}</dd></div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader><CardTitle>Order History ({ordersData?.total || 0} total)</CardTitle></CardHeader>
            <CardContent>
              {!ordersData?.items || ordersData.items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No orders yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersData.items.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Link to={`/admin/orders`} className="text-primary hover:underline font-medium">
                            {order.order_number}
                          </Link>
                        </TableCell>
                        <TableCell>{formatDate(order.requested_at)}</TableCell>
                        <TableCell><StatusBadge status={order.status} /></TableCell>
                        <TableCell>{order.items.length} items</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader><CardTitle>Order Status Distribution</CardTitle></CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">No activity data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
