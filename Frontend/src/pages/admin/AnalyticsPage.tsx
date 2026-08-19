import { useState } from "react";
import { useProductAnalytics, useMarketAnalytics } from "@/hooks";
import { PageHeader, CardSkeleton } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

export default function AnalyticsPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<string>(String(currentMonth));

  const { data: productAnalytics, isLoading: productLoading } = useProductAnalytics({ year, month: Number(month) });
  const { data: marketAnalytics, isLoading: marketLoading } = useMarketAnalytics({ year, month: Number(month) });

  if (productLoading || marketLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics" />
        <div className="grid gap-6 md:grid-cols-2">
          <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      </div>
    );
  }

  const stockData = productAnalytics?.stock_levels?.map((s) => ({
    name: s.product_name.length > 15 ? s.product_name.slice(0, 15) + "..." : s.product_name,
    current: s.current_stock,
    minimum: s.minimum_stock,
  })) || [];

  const marketOrdersData = marketAnalytics?.orders_per_market?.map((m) => ({
    name: m.market_name?.length > 12 ? m.market_name.slice(0, 12) + "..." : m.market_name,
    total: m.total_orders,
    delivered: m.delivered,
    pending: m.pending,
  })) || [];

  const monthlyDistData = productAnalytics?.monthly_distribution?.items?.map((item) => ({
    name: item.product_name.length > 12 ? item.product_name.slice(0, 12) + "..." : item.product_name,
    quantity: item.total_quantity,
  })) || [];

  const mostActiveData = marketAnalytics?.most_active?.slice(0, 8).map((m) => ({
    name: m.market_name?.length > 12 ? m.market_name.slice(0, 12) + "..." : m.market_name,
    orders: m.total_orders,
  })) || [];

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Business insights and data visualization" />

      <div className="flex gap-4">
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">January</SelectItem>
            <SelectItem value="2">February</SelectItem>
            <SelectItem value="3">March</SelectItem>
            <SelectItem value="4">April</SelectItem>
            <SelectItem value="5">May</SelectItem>
            <SelectItem value="6">June</SelectItem>
            <SelectItem value="7">July</SelectItem>
            <SelectItem value="8">August</SelectItem>
            <SelectItem value="9">September</SelectItem>
            <SelectItem value="10">October</SelectItem>
            <SelectItem value="11">November</SelectItem>
            <SelectItem value="12">December</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Product Analytics</TabsTrigger>
          <TabsTrigger value="markets">Market Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Most Requested Products</CardTitle></CardHeader>
              <CardContent>
                {productAnalytics?.most_requested && productAnalytics.most_requested.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productAnalytics.most_requested.slice(0, 8).map((p) => ({ name: p.product_name.length > 12 ? p.product_name.slice(0, 12) + "..." : p.product_name, quantity: p.total_quantity, orders: p.order_count }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="quantity" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Stock Levels</CardTitle></CardHeader>
              <CardContent>
                {stockData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stockData.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="current" fill="#3b82f6" name="Current" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="minimum" fill="#f59e0b" name="Minimum" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Monthly Distribution</CardTitle></CardHeader>
            <CardContent>
              {monthlyDistData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyDistData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="markets" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Orders Per Market</CardTitle></CardHeader>
              <CardContent>
                {marketOrdersData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={marketOrdersData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total" fill="#3b82f6" name="Total" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="delivered" fill="#10b981" name="Delivered" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Most Active Markets</CardTitle></CardHeader>
              <CardContent>
                {mostActiveData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={mostActiveData} cx="50%" cy="50%" outerRadius={100} dataKey="orders" label={({ name, orders }) => `${name}: ${orders}`}>
                        {mostActiveData.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Market Distribution</CardTitle></CardHeader>
            <CardContent>
              {marketAnalytics?.total_distributed && marketAnalytics.total_distributed.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={marketAnalytics.total_distributed.map((d) => ({ name: d.market_name?.length > 12 ? d.market_name.slice(0, 12) + "..." : d.market_name, quantity: d.total_quantity }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
