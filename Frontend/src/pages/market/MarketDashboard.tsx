import { useAuth } from "@/contexts/AuthContext";
import { useDashboardSummary } from "@/hooks";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageSkeleton } from "@/components/shared";
import { ShoppingCart, Package, CheckCircle, Clock } from "lucide-react";

export default function MarketDashboard() {
  const { user } = useAuth();
  const { data: summary, isLoading } = useDashboardSummary();

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Market Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.username}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Pending Orders" value={summary?.pending_orders ?? 0} icon={<Clock className="h-5 w-5" />} iconColor="text-yellow-600" />
        <KpiCard title="Approved Orders" value={summary?.approved_orders ?? 0} icon={<CheckCircle className="h-5 w-5" />} iconColor="text-blue-600" />
        <KpiCard title="Total Products" value={summary?.total_products ?? 0} icon={<Package className="h-5 w-5" />} iconColor="text-green-600" />
        <KpiCard title="Low Stock Items" value={summary?.low_stock_count ?? 0} icon={<ShoppingCart className="h-5 w-5" />} iconColor="text-red-600" />
      </div>
    </div>
  );
}
