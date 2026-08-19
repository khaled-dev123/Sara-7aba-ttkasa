import { useAuth } from "@/contexts/AuthContext";
import { useOrders, useDeliveries } from "@/hooks";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageSkeleton } from "@/components/shared";
import { ClipboardList, Truck, Package } from "lucide-react";

export default function WarehouseDashboard() {
  const { user } = useAuth();
  const { data: ordersData, isLoading: ordersLoading } = useOrders({ status: "approved", page_size: 100 });
  const { data: deliveries, isLoading: delLoading } = useDeliveries({ status: "on_route" });

  if (ordersLoading || delLoading) return <PageSkeleton />;

  const prepQueue = ordersData?.items?.filter((o) => o.status === "approved") || [];
  const onRoute = ordersData?.items?.filter((o) => o.status === "prepared") || [];
  const deliveredToday = deliveries?.filter((d) => d.status === "delivered") || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Warehouse Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.username}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard title="Orders to Prepare" value={prepQueue.length} icon={<ClipboardList className="h-5 w-5" />} iconColor="text-yellow-600" />
        <KpiCard title="Orders On Route" value={onRoute.length} icon={<Truck className="h-5 w-5" />} iconColor="text-blue-600" />
        <KpiCard title="Delivered Today" value={deliveredToday.length} icon={<Package className="h-5 w-5" />} iconColor="text-green-600" />
      </div>
    </div>
  );
}
