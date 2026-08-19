import { useState, useMemo } from "react";
import { useProducts, useCategories, useCreateOrder } from "@/hooks";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, EmptyState, useToast } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Package, Search, Plus, Minus, ShoppingCart, Trash2, X } from "lucide-react";

interface CartItem {
  product_id: number;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  available: number;
}

export default function MarketProductsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");

  const { data: productsData, isLoading } = useProducts({ search: search || undefined, category_id: categoryFilter ? Number(categoryFilter) : undefined, page_size: 100 });
  const { data: categories } = useCategories();
  const createOrder = useCreateOrder();
  const { addToast } = useToast();

  const products = productsData?.items || [];

  const addToCart = (product: typeof products[0]) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.current_stock) return prev;
        return prev.map((c) => c.product_id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { product_id: product.id, name: product.name, sku: product.sku, unit: product.unit, quantity: 1, available: product.current_stock }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) => {
      return prev.map((c) => {
        if (c.product_id !== productId) return c;
        const newQty = c.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > c.available) return c;
        return { ...c, quantity: newQty };
      }).filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((c) => c.product_id !== productId));
  };

  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const submitOrder = async () => {
    if (cart.length === 0) return;
    try {
      await createOrder.mutateAsync({
        items: cart.map((c) => ({ product_id: c.product_id, quantity: c.quantity })),
        notes: orderNotes || undefined,
      });
      addToast({ title: "Order placed successfully" });
      setCart([]);
      setCartOpen(false);
      setOrderNotes("");
    } catch (err: any) {
      addToast({ title: "Error", description: err?.response?.data?.detail || "Failed to place order", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Browse available products"
        actions={
          <Button onClick={() => setCartOpen(true)} className="relative">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Cart
            {cartCount > 0 && (
              <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">{cartCount}</Badge>
            )}
          </Button>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState title="No products available" icon={<Package className="h-12 w-12" />} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => {
            const cartItem = cart.find((c) => c.product_id === product.id);
            const inCart = !!cartItem;
            const maxReached = cartItem ? cartItem.quantity >= product.current_stock : false;

            return (
              <Card key={product.id} className="overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-12 w-12 text-muted-foreground/50" />
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm">{product.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{product.category_name || "Uncategorized"}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground">
                      {product.current_stock} {product.unit} available
                    </span>
                    {inCart ? (
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(product.id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium w-6 text-center">{cartItem?.quantity}</span>
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(product.id, 1)} disabled={maxReached}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => addToCart(product)} disabled={product.current_stock <= 0}>
                        <Plus className="mr-1 h-3 w-3" /> Add
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Shopping Cart</DialogTitle>
            <DialogDescription>{cart.length} product{cart.length !== 1 ? "s" : ""} in your cart</DialogDescription>
          </DialogHeader>
          {cart.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Your cart is empty</div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.product_id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.sku}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, 1)} disabled={item.quantity >= item.available}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => removeFromCart(item.product_id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Input placeholder="Order notes..." value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCartOpen(false)}>Cancel</Button>
            <Button onClick={submitOrder} disabled={cart.length === 0 || createOrder.isPending}>
              {createOrder.isPending ? "Placing..." : "Place Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
