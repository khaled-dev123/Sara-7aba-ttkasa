import { useState } from "react";
import { Link } from "react-router-dom";
import { useProducts, useCategories, useSuppliers, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks";
import { useAuth } from "@/contexts/AuthContext";
import { type ProductDetail } from "@/types";
import { PageHeader, Pagination, TableSkeleton, EmptyState, ConfirmDialog, useToast } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Package, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatCurrency } from "@/lib/utils";

const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  sku: z.string().min(1, "SKU is required"),
  category_id: z.coerce.number().min(1, "Category is required"),
  supplier_id: z.coerce.number().min(1, "Supplier is required"),
  purchase_price: z.coerce.number().min(0, "Price must be positive"),
  supplier_price: z.coerce.number().min(0, "Price must be positive"),
  current_stock: z.coerce.number().min(0, "Stock must be non-negative"),
  minimum_stock: z.coerce.number().min(0, "Minimum stock must be non-negative"),
  unit: z.string().default("piece"),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function ProductsBuyPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [editProduct, setEditProduct] = useState<ProductDetail | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading } = useProducts({
    page,
    page_size: 20,
    search: search || undefined,
    category_id: categoryFilter ? Number(categoryFilter) : undefined,
  });
  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const { addToast } = useToast();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", sku: "", category_id: 0, supplier_id: 0, purchase_price: 0, supplier_price: 0, current_stock: 0, minimum_stock: 0, unit: "piece" },
  });

  const openCreate = () => {
    setEditProduct(null);
    reset({ name: "", sku: "", category_id: 0, supplier_id: 0, purchase_price: 0, supplier_price: 0, current_stock: 0, minimum_stock: 0, unit: "piece" });
    setDialogOpen(true);
  };

  const openEdit = (product: ProductDetail) => {
    setEditProduct(product);
    reset({
      name: product.name,
      sku: product.sku,
      category_id: product.category_id,
      supplier_id: product.supplier_id,
      purchase_price: product.purchase_price,
      supplier_price: product.supplier_price,
      current_stock: product.current_stock,
      minimum_stock: product.minimum_stock,
      unit: product.unit,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (formData: ProductFormData) => {
    try {
      if (editProduct) {
        await updateMutation.mutateAsync({ id: editProduct.id, data: formData });
        addToast({ title: "Product updated successfully" });
      } else {
        await createMutation.mutateAsync(formData);
        addToast({ title: "Product created successfully" });
      }
      setDialogOpen(false);
      reset();
    } catch (err: any) {
      addToast({ title: "Error", description: err?.response?.data?.detail || "Something went wrong", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      addToast({ title: "Product deleted" });
    } catch (err: any) {
      addToast({ title: "Error", description: err?.response?.data?.detail || "Failed to delete", variant: "destructive" });
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products (Buy)"
        description="Manage purchasing: suppliers, purchase prices and stock intake"
        actions={
          user?.role === "admin" ? (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={7} />
      ) : !data?.items || data.items.length === 0 ? (
        <EmptyState title="No products found" description="Add your first product to get started" icon={<Package className="h-12 w-12" />} />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Supplier Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Min Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="h-8 w-8 rounded object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <Link to={`/admin/products/${product.id}`} className="hover:underline">{product.name}</Link>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell>{product.category_name || "-"}</TableCell>
                    <TableCell>{product.supplier_name || "-"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.purchase_price)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.supplier_price)}</TableCell>
                    <TableCell className="text-right">
                      <span className={product.current_stock <= product.minimum_stock ? "text-red-600 font-medium" : ""}>
                        {product.current_stock}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{product.minimum_stock}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${product.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                        {product.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-600" onClick={() => setDeleteId(product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editProduct ? "Edit Product" : "Create Product"}</DialogTitle>
            <DialogDescription>{editProduct ? "Update product details" : "Add a new product to the catalog"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input {...register("name")} placeholder="Product name" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input {...register("sku")} placeholder="SKU code" />
                {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={watch("category_id") ? String(watch("category_id")) : ""} onValueChange={(v) => setValue("category_id", Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category_id && <p className="text-xs text-destructive">{errors.category_id.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Select value={watch("supplier_id") ? String(watch("supplier_id")) : ""} onValueChange={(v) => setValue("supplier_id", Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers?.map((sup) => (
                      <SelectItem key={sup.id} value={String(sup.id)}>{sup.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.supplier_id && <p className="text-xs text-destructive">{errors.supplier_id.message}</p>}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Purchase Price</Label>
                <Input type="number" step="0.01" {...register("purchase_price")} />
                {errors.purchase_price && <p className="text-xs text-destructive">{errors.purchase_price.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Supplier Price</Label>
                <Input type="number" step="0.01" {...register("supplier_price")} />
                {errors.supplier_price && <p className="text-xs text-destructive">{errors.supplier_price.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Current Stock</Label>
                <Input type="number" {...register("current_stock")} />
                {errors.current_stock && <p className="text-xs text-destructive">{errors.current_stock.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Minimum Stock</Label>
                <Input type="number" {...register("minimum_stock")} />
                {errors.minimum_stock && <p className="text-xs text-destructive">{errors.minimum_stock.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input {...register("unit")} placeholder="piece" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : editProduct ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        onConfirm={handleDelete}
      />
    </div>
  );
}
