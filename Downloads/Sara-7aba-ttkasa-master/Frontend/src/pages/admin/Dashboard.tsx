import { useDashboardSummary, useOrders, useLowStock } from "@/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, PageSkeleton } from "@/components/shared";
import { Package, Store, ShoppingCart, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function AdminDashboard() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: ordersData, isLoading: ordersLoading } = useOrders({ page: 1, page_size: 10 });
  const { data: lowStock, isLoading: lowStockLoading } = useLowStock();

  if (summaryLoading || ordersLoading) return <PageSkeleton />;

  const stats = [
    { label: "Total Products", value: summary?.total_products ?? 0, icon: <Package className="h-5 w-5" />, color: "text-blue-600" },
    { label: "Total Markets", value: summary?.total_markets ?? 0, icon: <Store className="h-5 w-5" />, color: "text-green-600" },
    { label: "Total Stock", value: summary?.total_stock ?? 0, icon: <ShoppingCart className="h-5 w-5" />, color: "text-purple-600" },
    { label: "Pending Orders", value: summary?.pending_orders ?? 0, icon: <Clock className="h-5 w-5" />, color: "text-yellow-600" },
    { label: "Approved Orders", value: summary?.approved_orders ?? 0, icon: <CheckCircle className="h-5 w-5" />, color: "text-blue-600" },
    { label: "Low Stock", value: summary?.low_stock_count ?? 0, icon: <AlertTriangle className="h-5 w-5" />, color: "text-red-600" },
  ];

  const statusData = ordersData?.items?.reduce((acc: Record<string, number>, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {}) || {};

  const pieData = Object.entries(statusData).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1).replace("_", " "),
    value,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your distribution business</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <div className={stat.color}>{stat.icon}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">No order data</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Stock Products</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : lowStock && lowStock.length > 0 ? (
              <div className="space-y-3">
                {lowStock.slice(0, 5).map((item) => (
                  <div key={item.product_id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600">{item.current_stock} left</p>
                      <p className="text-xs text-muted-foreground">Min: {item.minimum_stock}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">All products are well stocked</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {ordersData?.items && ordersData.items.length > 0 ? (
            <div className="space-y-3">
              {ordersData.items.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">{order.market_name} &middot; {formatDate(order.requested_at)}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">No orders yet</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
