import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMarket, useOrders, useMarketUsers, useAssignMarketUser, useRemoveMarketUser } from "@/hooks";
import { PageHeader, PageSkeleton, StatusBadge, useToast } from "@/components/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, UserPlus, Trash2, Users } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { authApi } from "@/api";
import type { Profile } from "@/types";

export default function MarketDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const marketId = Number(id);
  const { data: market, isLoading } = useMarket(marketId);
  const { data: ordersData } = useOrders({ market_id: marketId, page_size: 50 });
  const { data: marketUsers } = useMarketUsers(marketId);
  const assignMutation = useAssignMarketUser(marketId);
  const removeMutation = useRemoveMarketUser(marketId);
  const { addToast } = useToast();

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);

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

  const assignedUserIds = new Set(marketUsers?.map((u) => u.user_id) || []);
  const assignableProfiles = allProfiles.filter((p) => p.role === "market" && !assignedUserIds.has(p.user_id));

  const openAssign = async () => {
    setProfilesLoading(true);
    setAssignDialogOpen(true);
    try {
      const profiles = await authApi.profiles();
      setAllProfiles(profiles);
    } catch {
      addToast({ title: "Failed to load users", variant: "destructive" });
    } finally {
      setProfilesLoading(false);
    }
  };

  const handleAssign = async (userId: number) => {
    try {
      await assignMutation.mutateAsync(userId);
      addToast({ title: "User assigned to market" });
    } catch (err: any) {
      addToast({ title: "Error", description: err?.response?.data?.detail || "Failed", variant: "destructive" });
    }
  };

  const handleRemove = async (userId: number) => {
    try {
      await removeMutation.mutateAsync(userId);
      addToast({ title: "User removed from market" });
    } catch (err: any) {
      addToast({ title: "Error", description: err?.response?.data?.detail || "Failed", variant: "destructive" });
    }
  };

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
            <StatusBadge status={market.is_active ? "active" : "inactive"} />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="info">Information</TabsTrigger>
          <TabsTrigger value="orders">Order History</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
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

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Assigned Users ({marketUsers?.length || 0})
              </CardTitle>
              <Button size="sm" onClick={openAssign}>
                <UserPlus className="mr-2 h-4 w-4" />
                Assign User
              </Button>
            </CardHeader>
            <CardContent>
              {!marketUsers || marketUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No users assigned to this market</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marketUsers.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium">{u.username}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-600"
                            onClick={() => handleRemove(u.user_id)}
                          >
                            <Trash2 className="h-4 w-4" />
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

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign User to {market.name}</DialogTitle>
            <DialogDescription>Select a market user to assign to this market</DialogDescription>
          </DialogHeader>
          {profilesLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading users...</p>
          ) : assignableProfiles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No available users to assign</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {assignableProfiles.map((p) => (
                <button
                  key={p.user_id}
                  onClick={() => { handleAssign(p.user_id); setAssignDialogOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                >
                  <div className="flex-1">
                    <p className="font-medium">{p.username}</p>
                    <p className="text-xs text-muted-foreground">{p.market_name ? `Currently: ${p.market_name}` : p.role}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
