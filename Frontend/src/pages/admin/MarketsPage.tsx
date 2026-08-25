import { useState } from "react";
import { Link } from "react-router-dom";
import { useMarkets, useCreateMarket, useUpdateMarket, useDeleteMarket } from "@/hooks";
import { type Market } from "@/types";
import { PageHeader, TableSkeleton, EmptyState, ConfirmDialog, useToast } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Store, ToggleLeft, ToggleRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDate } from "@/lib/utils";

const marketSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().optional(),
  phone: z.string().optional(),
  manager_name: z.string().optional(),
  is_active: z.boolean().default(true),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type MarketFormData = z.infer<typeof marketSchema>;

export default function MarketsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Market | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: markets, isLoading } = useMarkets();
  const createMutation = useCreateMarket();
  const updateMutation = useUpdateMarket();
  const deleteMutation = useDeleteMarket();
  const { addToast } = useToast();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<MarketFormData>({
    resolver: zodResolver(marketSchema),
    defaultValues: { name: "", address: "", phone: "", manager_name: "", is_active: true, username: "", password: "" },
  });

  const openCreate = () => { setEditItem(null); reset({ name: "", address: "", phone: "", manager_name: "", is_active: true, username: "", password: "" }); setDialogOpen(true); };
  const openEdit = (m: Market) => { setEditItem(m); reset({ name: m.name, address: m.address, phone: m.phone, manager_name: m.manager_name, is_active: m.is_active }); setDialogOpen(true); };

  const onSubmit = async (data: MarketFormData) => {
    try {
      if (editItem) { const { username: _, password: __, ...updateData } = data; await updateMutation.mutateAsync({ id: editItem.id, data: updateData }); addToast({ title: "Market updated" }); }
      else { await createMutation.mutateAsync(data); addToast({ title: "Market created" }); }
      setDialogOpen(false);
    } catch (err: any) { addToast({ title: "Error", description: err?.response?.data?.detail || "Failed", variant: "destructive" }); }
  };

  const toggleActive = async (market: Market) => {
    try { await updateMutation.mutateAsync({ id: market.id, data: { is_active: !market.is_active } }); addToast({ title: `Market ${market.is_active ? "deactivated" : "activated"}` }); }
    catch (err: any) { addToast({ title: "Error", variant: "destructive" }); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteMutation.mutateAsync(deleteId); addToast({ title: "Market deleted" }); }
    catch (err: any) { addToast({ title: "Error", description: err?.response?.data?.detail || "Failed", variant: "destructive" }); }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Markets" description="Manage your markets" actions={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Market</Button>} />

      {isLoading ? <TableSkeleton rows={4} cols={6} /> : !markets || markets.length === 0 ? (
        <EmptyState title="No markets" description="Add your first market" icon={<Store className="h-12 w-12" />} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {markets.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium"><Link to={`/admin/markets/${m.id}`} className="hover:underline">{m.name}</Link></TableCell>
                  <TableCell>{m.manager_name || "-"}</TableCell>
                  <TableCell>{m.phone || "-"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{m.address || "-"}</TableCell>
                  <TableCell>
                    <button onClick={() => toggleActive(m)} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                      {m.is_active ? "Active" : "Inactive"}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-600" onClick={() => setDeleteId(m.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Market" : "New Market"}</DialogTitle>
            <DialogDescription>{editItem ? "Update market details" : "Add a new market"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...register("name")} placeholder="Market name" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Manager</Label>
                <Input {...register("manager_name")} placeholder="Manager name" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input {...register("phone")} placeholder="Phone" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input {...register("address")} placeholder="Address" />
            </div>
            {!editItem && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input {...register("username")} placeholder="Login username" />
                  {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input {...register("password")} type="password" placeholder="Login password" />
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{editItem ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }} title="Delete Market" description="Are you sure you want to delete this market?" onConfirm={handleDelete} />
    </div>
  );
}
