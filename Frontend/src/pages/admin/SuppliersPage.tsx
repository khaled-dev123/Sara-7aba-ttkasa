import { useState } from "react";
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from "@/hooks";
import { type Supplier } from "@/types";
import { PageHeader, TableSkeleton, EmptyState, ConfirmDialog, useToast } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Truck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDate } from "@/lib/utils";

const supplierSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
});
type SupplierFormData = z.infer<typeof supplierSchema>;

export default function SuppliersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Supplier | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: suppliers, isLoading } = useSuppliers();
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  const deleteMutation = useDeleteSupplier();
  const { addToast } = useToast();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: "", phone: "", email: "", address: "" },
  });

  const openCreate = () => { setEditItem(null); reset({ name: "", phone: "", email: "", address: "" }); setDialogOpen(true); };
  const openEdit = (sup: Supplier) => { setEditItem(sup); reset({ name: sup.name, phone: sup.phone, email: sup.email, address: sup.address }); setDialogOpen(true); };

  const onSubmit = async (data: SupplierFormData) => {
    try {
      if (editItem) { await updateMutation.mutateAsync({ id: editItem.id, data }); addToast({ title: "Supplier updated" }); }
      else { await createMutation.mutateAsync(data); addToast({ title: "Supplier created" }); }
      setDialogOpen(false);
    } catch (err: any) { addToast({ title: "Error", description: err?.response?.data?.detail || "Failed", variant: "destructive" }); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteMutation.mutateAsync(deleteId); addToast({ title: "Supplier deleted" }); }
    catch (err: any) { addToast({ title: "Error", description: err?.response?.data?.detail || "Failed", variant: "destructive" }); }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Suppliers" description="Manage your suppliers" actions={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Supplier</Button>} />

      {isLoading ? <TableSkeleton rows={4} cols={5} /> : !suppliers || suppliers.length === 0 ? (
        <EmptyState title="No suppliers" description="Add your first supplier" icon={<Truck className="h-12 w-12" />} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((sup) => (
                <TableRow key={sup.id}>
                  <TableCell className="font-medium">{sup.name}</TableCell>
                  <TableCell>{sup.phone || "-"}</TableCell>
                  <TableCell>{sup.email || "-"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{sup.address || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(sup)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-600" onClick={() => setDeleteId(sup.id)}><Trash2 className="h-4 w-4" /></Button>
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
            <DialogTitle>{editItem ? "Edit Supplier" : "New Supplier"}</DialogTitle>
            <DialogDescription>{editItem ? "Update supplier details" : "Add a new supplier"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...register("name")} placeholder="Supplier name" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input {...register("phone")} placeholder="Phone number" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input {...register("email")} placeholder="Email address" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input {...register("address")} placeholder="Address" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{editItem ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }} title="Delete Supplier" description="Are you sure you want to delete this supplier?" onConfirm={handleDelete} />
    </div>
  );
}
