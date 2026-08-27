import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@/hooks";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageSkeleton } from "@/components/shared";
import { ClipboardList, CheckCircle, Clock } from "lucide-react";

export default function WarehouseDashboard() {
  const { user } = useAuth();
  const { data: approvedData, isLoading: approvedLoading } = useOrders({ status: "approved", page_size: 100 });
  const { data: pendingData, isLoading: pendingLoading } = useOrders({ status: "pending", page_size: 100 });

  if (approvedLoading || pendingLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Warehouse Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.username}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard title="Approved Orders" value={approvedData?.total || 0} icon={<CheckCircle className="h-5 w-5" />} iconColor="text-green-600" />
        <KpiCard title="Pending Approval" value={pendingData?.total || 0} icon={<Clock className="h-5 w-5" />} iconColor="text-yellow-600" />
        <KpiCard title="Total to Dispatch" value={(approvedData?.total || 0) + (pendingData?.total || 0)} icon={<ClipboardList className="h-5 w-5" />} iconColor="text-blue-600" />
      </div>
    </div>
  );
}
