import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useProducts, useCreateOrder } from "@/hooks";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/ui/search-bar";
import { ShoppingCart as CartIcon, Plus, Minus, Trash2, Package, Send } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/shared";

interface CartItem {
  product_id: number;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
}

export default function MarketCartPage() {
  const { user } = useAuth();
  const { data, isLoading } = useProducts({ page_size: 100 });
  const createOrder = useCreateOrder();
  const { addToast } = useToast();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const products = data?.items || [];
  const filtered = search
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
    : products;

  const cartTotal = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = useCallback((product: typeof products[0]) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === product.id);
      if (existing) {
        return prev.map((c) => c.product_id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { product_id: product.id, name: product.name, sku: product.sku, unit: product.unit, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback((productId: number, delta: number) => {
    setCart((prev) => {
      return prev.map((c) => {
        if (c.product_id === productId) {
          const newQty = c.quantity + delta;
          return newQty > 0 ? { ...c, quantity: newQty } : c;
        }
        return c;
      }).filter((c) => c.quantity > 0);
    });
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    setCart((prev) => prev.filter((c) => c.product_id !== productId));
  }, []);

  const submitOrder = async () => {
    if (cart.length === 0) return;
    try {
      await createOrder.mutateAsync({
        items: cart.map((c) => ({ product_id: c.product_id, quantity: c.quantity })),
      });
      setCart([]);
      addToast({ title: "Order submitted successfully" });
    } catch (err: any) {
      addToast({ title: "Error", description: err?.response?.data?.detail || "Failed to submit order", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Browse Products"
        description="Select products and add them to your order"
        actions={
          <Badge variant="secondary" className="text-sm px-3 py-1">
            <CartIcon className="mr-1 h-4 w-4" /> {cart.length} items ({cartTotal} units)
          </Badge>
        }
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Search products..." className="max-w-md" />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => {
            const inCart = cart.find((c) => c.product_id === product.id);
            return (
              <Card key={product.id} className={inCart ? "ring-2 ring-primary" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-sm">{product.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                      </div>
                    </div>
                    {product.current_stock <= product.minimum_stock && (
                      <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Available: {product.current_stock} {product.unit}</p>
                    </div>
                    {inCart ? (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(product.id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{inCart.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(product.id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => removeFromCart(product.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => addToCart(product)} disabled={product.current_stock === 0}>
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

      {cart.length > 0 && (
        <Card className="sticky bottom-4 border-primary shadow-lg">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{cart.length} products selected</p>
              <p className="text-sm text-muted-foreground">{cartTotal} total units</p>
            </div>
            <Button onClick={submitOrder} disabled={createOrder.isPending} size="lg">
              <Send className="mr-2 h-4 w-4" /> Submit Order
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
