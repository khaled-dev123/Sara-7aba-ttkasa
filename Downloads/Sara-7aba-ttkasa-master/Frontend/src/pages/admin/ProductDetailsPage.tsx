import { useParams, Link } from "react-router-dom";
import { useProduct, useStockMovements } from "@/hooks";
import { PageHeader, PageSkeleton, StatusBadge } from "@/components/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const { data: product, isLoading } = useProduct(productId);
  const { data: movements, isLoading: movLoading } = useStockMovements({ product_id: productId });

  if (isLoading) return <PageSkeleton />;
  if (!product) return <div className="p-8 text-center text-muted-foreground">Product not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/products/buy"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <PageHeader title={product.name} description={`SKU: ${product.sku}`} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Category</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-semibold">{product.category_name || "-"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Supplier</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-semibold">{product.supplier_name || "-"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Current Stock</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-lg font-semibold ${product.current_stock <= product.minimum_stock ? "text-red-600" : ""}`}>
              {product.current_stock} {product.unit}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Purchase Price</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-semibold">{formatCurrency(product.purchase_price)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Supplier Price</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-semibold">{formatCurrency(product.supplier_price)}</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Information</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardHeader><CardTitle>Product Information</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div><dt className="text-sm text-muted-foreground">Name</dt><dd className="font-medium">{product.name}</dd></div>
                <div><dt className="text-sm text-muted-foreground">SKU</dt><dd className="font-mono">{product.sku}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Unit</dt><dd className="font-medium">{product.unit}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Status</dt><dd><StatusBadge status={product.is_active ? "active" : "inactive"} /></dd></div>
                <div><dt className="text-sm text-muted-foreground">Minimum Stock</dt><dd className="font-medium">{product.minimum_stock}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Purchase Price</dt><dd className="font-medium">{formatCurrency(product.purchase_price)}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Supplier Price</dt><dd className="font-medium">{formatCurrency(product.supplier_price)}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Created</dt><dd className="font-medium">{formatDateTime(product.created_at)}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Updated</dt><dd className="font-medium">{formatDateTime(product.updated_at)}</dd></div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader><CardTitle>Stock Movements</CardTitle></CardHeader>
            <CardContent>
              {movLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}</div>
              ) : !movements || movements.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No stock movements recorded</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm">{formatDateTime(m.created_at)}</TableCell>
                        <TableCell><StatusBadge status={m.movement_type} /></TableCell>
                        <TableCell className="text-right font-medium">{m.quantity}</TableCell>
                        <TableCell className="text-sm">{m.reference_type} #{m.reference_id}</TableCell>
                        <TableCell className="text-sm">{m.created_by_username || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
