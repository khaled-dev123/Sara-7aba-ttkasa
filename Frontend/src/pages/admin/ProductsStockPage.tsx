import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useProducts,
  useStockMovements,
  useStockAdjust,
  useStockReturn,
  useUpdateProduct,
  useCategories,
  useOrders,
} from "@/hooks";
import { type ProductDetail, type StockMovement } from "@/types";
import { PageHeader, TableSkeleton, EmptyState, useToast } from "@/components/shared";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OrdersManagementView } from "@/components/admin/OrdersManagementView";
import {
  Package, Search, AlertTriangle, CircleX, TrendingUp, TrendingDown,
  ArrowUpCircle, ArrowDownCircle, History, Plus, Minus, BarChart3,
  RefreshCw, Layers, ShoppingCart, ArrowRight, Clock, CornerUpLeft,
  Settings2, Filter, CheckCircle2, ShieldAlert, FileText,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

type StockStatus = "ok" | "low" | "out";

function getStatus(p: ProductDetail): StockStatus {
  if (p.current_stock <= 0) return "out";
  if (p.current_stock <= p.minimum_stock) return "low";
  return "ok";
}

const MOVEMENT_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  purchase: {
    label: "Purchase",
    color: "text-emerald-600",
    icon: <TrendingUp className="h-3.5 w-3.5" />,
  },
  delivery: {
    label: "Delivery",
    color: "text-blue-600",
    icon: <TrendingDown className="h-3.5 w-3.5" />,
  },
  adjustment: {
    label: "Adjustment",
    color: "text-amber-500",
    icon: <RefreshCw className="h-3.5 w-3.5" />,
  },
  return: {
    label: "Return",
    color: "text-purple-600",
    icon: <ArrowUpCircle className="h-3.5 w-3.5" />,
  },
};

// ── Adjust Stock Dialog ───────────────────────────────────────────────────────
interface AdjustDialogProps {
  product: ProductDetail;
  onClose: () => void;
}

function AdjustDialog({ product, onClose }: AdjustDialogProps) {
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("");
  const adjustMutation = useStockAdjust();
  const { addToast } = useToast();

  const handleSubmit = async () => {
    try {
      await adjustMutation.mutateAsync({
        product_id: product.id,
        quantity: qty,
        direction,
        reason,
      });
      addToast({
        title: "Stock Adjusted",
        description: `Successfully ${direction === "add" ? "added" : "removed"} ${qty} ${product.unit} for ${product.name}.`,
      });
      onClose();
    } catch (err: any) {
      addToast({
        title: "Adjustment Failed",
        description: err?.response?.data?.detail || "Failed to adjust stock",
        variant: "destructive",
      });
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Adjust Stock — {product.name}
        </DialogTitle>
        <DialogDescription>Manually update physical stock level with audit trail reason</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="rounded-lg border bg-muted/40 p-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Current Available Stock</span>
          <span className="font-bold text-lg">{product.current_stock} <span className="text-xs font-normal text-muted-foreground">{product.unit}</span></span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setDirection("add")}
            className={`flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-semibold transition-all ${
              direction === "add"
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "border-border text-muted-foreground hover:border-emerald-300"
            }`}
          >
            <Plus className="h-4 w-4" /> Add Stock
          </button>
          <button
            onClick={() => setDirection("remove")}
            className={`flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-semibold transition-all ${
              direction === "remove"
                ? "border-destructive bg-destructive/10 text-destructive"
                : "border-border text-muted-foreground hover:border-destructive/40"
            }`}
          >
            <Minus className="h-4 w-4" /> Remove Stock
          </button>
        </div>

        <div className="space-y-1.5">
          <Label>Quantity</Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
              className="text-center font-bold text-lg"
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => setQty((q) => q + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {direction === "remove" && qty > product.current_stock && (
            <p className="text-xs text-destructive font-medium">⚠ Cannot remove more than current stock ({product.current_stock})</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Reason <span className="text-muted-foreground">(optional)</span></Label>
          <Textarea
            placeholder="e.g. Damaged goods, physical count correction, expired item..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 text-sm flex items-center justify-between">
          <span className="text-muted-foreground">New stock level after adjustment</span>
          <span className={`font-bold text-base ${direction === "add" ? "text-emerald-600" : "text-destructive"}`}>
            {direction === "add" ? product.current_stock + qty : Math.max(0, product.current_stock - qty)} {product.unit}
          </span>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={
            adjustMutation.isPending ||
            qty < 1 ||
            (direction === "remove" && qty > product.current_stock)
          }
          className={direction === "remove" ? "bg-destructive hover:bg-destructive/90 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
        >
          {adjustMutation.isPending ? "Saving..." : "Confirm Adjustment"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Stock Return Dialog ────────────────────────────────────────────────────────
interface ReturnDialogProps {
  product: ProductDetail;
  onClose: () => void;
}

function ReturnDialog({ product, onClose }: ReturnDialogProps) {
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("");
  const returnMutation = useStockReturn();
  const { addToast } = useToast();

  const handleSubmit = async () => {
    try {
      await returnMutation.mutateAsync({
        product_id: product.id,
        quantity: qty,
        reason,
      });
      addToast({
        title: "Stock Returned",
        description: `Returned ${qty} ${product.unit} of ${product.name} back to inventory.`,
      });
      onClose();
    } catch (err: any) {
      addToast({
        title: "Return Failed",
        description: err?.response?.data?.detail || "Failed to process stock return",
        variant: "destructive",
      });
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CornerUpLeft className="h-5 w-5 text-purple-600" />
          Process Return — {product.name}
        </DialogTitle>
        <DialogDescription>Record items returned from market or customer back into stock</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="rounded-lg border bg-muted/40 p-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Current Stock</span>
          <span className="font-bold text-lg">{product.current_stock} <span className="text-xs font-normal text-muted-foreground">{product.unit}</span></span>
        </div>

        <div className="space-y-1.5">
          <Label>Quantity to Return</Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
              className="text-center font-bold text-lg"
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => setQty((q) => q + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Return Reason / Note</Label>
          <Textarea
            placeholder="e.g. Unsold market stock returned, order cancellation..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
        </div>

        <div className="rounded-lg border bg-purple-50 dark:bg-purple-950/30 p-3 text-sm flex items-center justify-between">
          <span className="text-purple-700 dark:text-purple-300">Stock after return</span>
          <span className="font-bold text-base text-purple-700 dark:text-purple-300">
            {product.current_stock + qty} {product.unit}
          </span>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={returnMutation.isPending || qty < 1}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {returnMutation.isPending ? "Processing..." : "Process Return"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Min Threshold Dialog ───────────────────────────────────────────────────────
interface ThresholdDialogProps {
  product: ProductDetail;
  onClose: () => void;
}

function ThresholdDialog({ product, onClose }: ThresholdDialogProps) {
  const [minStock, setMinStock] = useState(product.minimum_stock);
  const updateMutation = useUpdateProduct();
  const { addToast } = useToast();

  const handleSubmit = async () => {
    try {
      await updateMutation.mutateAsync({
        id: product.id,
        data: { minimum_stock: minStock },
      });
      addToast({
        title: "Threshold Updated",
        description: `Minimum stock threshold for ${product.name} set to ${minStock} ${product.unit}.`,
      });
      onClose();
    } catch (err: any) {
      addToast({
        title: "Update Failed",
        description: err?.response?.data?.detail || "Failed to update minimum stock threshold",
        variant: "destructive",
      });
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-amber-600" />
          Min. Stock Threshold — {product.name}
        </DialogTitle>
        <DialogDescription>Set the minimum stock alert trigger level for this product</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label>Minimum Stock Threshold</Label>
          <Input
            type="number"
            min={0}
            value={minStock}
            onChange={(e) => setMinStock(Math.max(0, Number(e.target.value)))}
            className="font-bold text-lg"
          />
          <p className="text-xs text-muted-foreground">
            When current stock drops to or below this level ({minStock}), the system will highlight the product with a <strong>Low Stock</strong> warning.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={updateMutation.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
          {updateMutation.isPending ? "Saving..." : "Save Threshold"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Stock History Dialog ──────────────────────────────────────────────────────
interface HistoryDialogProps {
  product: ProductDetail;
  movements: StockMovement[];
  onClose: () => void;
}

function HistoryDialog({ product, movements, onClose }: HistoryDialogProps) {
  const productMovements = movements
    .filter((m) => m.product_id === product.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Stock Audit History — {product.name}
        </DialogTitle>
      </DialogHeader>

      {productMovements.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No stock movements recorded for this product yet.</p>
      ) : (
        <div className="space-y-2 py-2">
          {productMovements.map((m) => {
            const type = m.movement_type?.toString().replace("_", "") === "return_"
              ? "return"
              : m.movement_type?.toString();
            const meta = MOVEMENT_META[type] ?? MOVEMENT_META["adjustment"];
            const isPositive = m.quantity > 0;

            return (
              <div
                key={m.id}
                className="flex items-start gap-3 rounded-lg border p-3 text-sm"
              >
                <div className={`mt-0.5 shrink-0 ${meta.color}`}>{meta.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-semibold text-xs px-2 py-0.5 rounded-full border ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className="text-muted-foreground text-xs">{formatDateTime(m.created_at)}</span>
                    {m.created_by_username && (
                      <span className="text-muted-foreground text-xs">by <strong>{m.created_by_username}</strong></span>
                    )}
                  </div>
                  {m.reference_type && m.reference_type !== "adjustment" && (
                    <p className="text-xs text-muted-foreground mt-1">Ref: {m.reference_type} {m.reference_id ? `#${m.reference_id}` : ""}</p>
                  )}
                </div>
                <div className={`shrink-0 font-bold text-base ${isPositive ? "text-emerald-600" : "text-destructive"}`}>
                  {isPositive ? "+" : ""}{m.quantity} <span className="text-xs font-normal text-muted-foreground">{product.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────
export default function ProductsStockPage() {
  const [activeTab, setActiveTab] = useState("inventory");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("all");

  const [adjustProduct, setAdjustProduct] = useState<ProductDetail | null>(null);
  const [returnProduct, setReturnProduct] = useState<ProductDetail | null>(null);
  const [thresholdProduct, setThresholdProduct] = useState<ProductDetail | null>(null);
  const [historyProduct, setHistoryProduct] = useState<ProductDetail | null>(null);

  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);
  const [selectedProductName, setSelectedProductName] = useState<string | undefined>(undefined);

  const { data: productsData, isLoading: productsLoading } = useProducts({ page: 1, page_size: 1000 });
  const { data: categories } = useCategories();
  const { data: movements = [], isLoading: movementsLoading } = useStockMovements({ limit: 1000 });
  const { data: pendingOrdersData } = useOrders({ status: "pending", page_size: 1 });
  const { data: allOrdersData } = useOrders({ page_size: 1 });

  const products = (productsData?.items ?? []).filter((p) => p.is_active);
  const pendingOrdersCount = pendingOrdersData?.total ?? 0;
  const totalOrdersCount = allOrdersData?.total ?? 0;

  // Filtered Products List
  const filteredProducts = products
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => categoryFilter === "all" || p.category_id === Number(categoryFilter))
    .filter((p) => {
      if (statusFilter === "all") return true;
      const status = getStatus(p);
      if (statusFilter === "ok") return status === "ok";
      if (statusFilter === "low") return status === "low";
      if (statusFilter === "out") return status === "out";
      return true;
    });

  // KPI Stats
  const totalProducts = products.length;
  const lowStockCount = products.filter((p) => getStatus(p) === "low").length;
  const outOfStockCount = products.filter((p) => getStatus(p) === "out").length;
  const totalStockUnits = products.reduce((s, p) => s + p.current_stock, 0);

  // Per-product movement stats
  function getProductMovements(productId: number) {
    const pm = movements.filter((m) => m.product_id === productId);
    const totalIn = pm.filter((m) => m.quantity > 0).reduce((s, m) => s + m.quantity, 0);
    const totalOut = pm.filter((m) => m.quantity < 0).reduce((s, m) => s + Math.abs(m.quantity), 0);
    const deliveries = pm.filter((m) => m.movement_type?.toString() === "delivery").length;
    return { totalIn, totalOut, deliveries };
  }

  const handleViewProductOrders = (productId: number, productName: string) => {
    setSelectedProductId(productId);
    setSelectedProductName(productName);
    setActiveTab("orders");
  };

  const isLoading = productsLoading || movementsLoading;

  const statCards = [
    {
      label: "Total Products",
      value: totalProducts,
      icon: <Package className="h-5 w-5" />,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      onClick: () => { setStatusFilter("all"); setActiveTab("inventory"); },
    },
    {
      label: "Total Inventory Units",
      value: totalStockUnits.toLocaleString(),
      icon: <BarChart3 className="h-5 w-5" />,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "Low Stock Alert",
      value: lowStockCount,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      highlight: lowStockCount > 0,
      onClick: () => { setStatusFilter("low"); setActiveTab("inventory"); },
    },
    {
      label: "Out of Stock",
      value: outOfStockCount,
      icon: <CircleX className="h-5 w-5" />,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950/30",
      highlight: outOfStockCount > 0,
      onClick: () => { setStatusFilter("out"); setActiveTab("inventory"); },
    },
    {
      label: "Pending Orders Reserving Stock",
      value: pendingOrdersCount,
      icon: <Clock className="h-5 w-5" />,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/30",
      highlight: pendingOrdersCount > 0,
      onClick: () => setActiveTab("orders"),
    },
  ];

  const filteredMovements = movements.filter((m) => {
    if (movementTypeFilter !== "all" && m.movement_type?.toString() !== movementTypeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const pName = m.product_name?.toLowerCase() || "";
      const pSku = m.sku?.toLowerCase() || "";
      const uName = m.created_by_username?.toLowerCase() || "";
      if (!pName.includes(q) && !pSku.includes(q) && !uName.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products (Stock Management)"
        description="Comprehensive physical inventory management — adjust stock levels, process returns, configure min thresholds, and review stock audit logs"
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((s) => (
          <Card
            key={s.label}
            className={`border-0 shadow-sm transition-all ${s.bg} ${s.onClick ? "cursor-pointer hover:ring-2 hover:ring-primary/40" : ""}`}
            onClick={s.onClick}
          >
            <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                <div className={`rounded-lg p-2 bg-white/60 dark:bg-black/20 ${s.color}`}>
                  {s.icon}
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold">{s.value}</span>
                {s.highlight && (
                  <Badge variant="outline" className="border-current text-xs font-semibold px-1.5 py-0">
                    Action
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <TabsList className="grid w-full grid-cols-3 max-w-xl">
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span>Stock Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="movements" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span>Audit Log & Movements</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span>Orders & Reservations</span>
              {pendingOrdersCount > 0 ? (
                <Badge className="ml-1 h-5 px-1.5 bg-purple-600 text-white font-bold text-[10px] rounded-full">
                  {pendingOrdersCount}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">({totalOrdersCount})</span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Tab 1: Stock Inventory & Management ── */}
        <TabsContent value="inventory" className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search product or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Stock Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ok">In Stock</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {statusFilter !== "all" || categoryFilter !== "all" || search ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(""); setCategoryFilter("all"); setStatusFilter("all"); }}
                className="text-xs text-muted-foreground"
              >
                Reset Filters
              </Button>
            ) : null}
          </div>

          {/* Table */}
          {isLoading ? (
            <TableSkeleton rows={6} cols={10} />
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              title="No products found"
              description="Try adjusting your search query or filters"
              icon={<Package className="h-12 w-12" />}
            />
          ) : (
            <Card className="border shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[220px]">Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Reserved Stock</TableHead>
                    <TableHead className="text-right">Min. Threshold</TableHead>
                    <TableHead className="w-[130px]">Health</TableHead>
                    <TableHead className="text-right">Deliveries</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Stock Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const status = getStatus(product);
                    const { deliveries } = getProductMovements(product.id);
                    const reserved = product.reserved_stock ?? 0;
                    const available = Math.max(product.current_stock - reserved, 0);

                    const target = Math.max(product.minimum_stock * 2, 1);
                    const pct = Math.min(100, Math.round((product.current_stock / target) * 100));

                    const barColor =
                      status === "out"
                        ? "bg-red-500"
                        : status === "low"
                        ? "bg-amber-500"
                        : "bg-emerald-500";

                    const statusBadge =
                      status === "out" ? (
                        <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                      ) : status === "low" ? (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 text-xs">
                          <AlertTriangle className="mr-1 h-3 w-3" /> Low Stock
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs">
                          In Stock
                        </Badge>
                      );

                    return (
                      <TableRow
                        key={product.id}
                        className={
                          status === "out"
                            ? "bg-red-50/40 dark:bg-red-950/10"
                            : status === "low"
                            ? "bg-amber-50/40 dark:bg-amber-950/10"
                            : ""
                        }
                      >
                        {/* Product name */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.image_url ? (
                              <img src={product.image_url} alt="" className="h-9 w-9 rounded object-cover shrink-0 border" />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded bg-muted shrink-0 border">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <Link
                                to={`/admin/products/${product.id}`}
                                className="font-medium hover:underline text-primary truncate block text-sm"
                              >
                                {product.name}
                              </Link>
                              <span className="text-[11px] text-muted-foreground font-mono">ID: #{product.id}</span>
                            </div>
                          </div>
                        </TableCell>

                        {/* SKU */}
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {product.sku}
                        </TableCell>

                        {/* Category */}
                        <TableCell className="text-xs text-muted-foreground">
                          {product.category_name || "-"}
                        </TableCell>

                        {/* Current stock */}
                        <TableCell className="text-right">
                          <span className={`font-bold text-base ${status !== "ok" ? (status === "out" ? "text-red-600" : "text-amber-600") : "text-foreground"}`}>
                            {product.current_stock}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">{product.unit}</span>
                        </TableCell>

                        {/* Reserved Stock */}
                        <TableCell className="text-right">
                          {reserved > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleViewProductOrders(product.id, product.name)}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-full hover:bg-amber-200"
                                >
                                  <Clock className="h-3 w-3" />
                                  {reserved} pending
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Reserved by pending orders awaiting admin approval</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground text-xs">0</span>
                          )}
                        </TableCell>

                        {/* Min threshold */}
                        <TableCell className="text-right text-xs">
                          <button
                            onClick={() => setThresholdProduct(product)}
                            className="hover:underline font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                            title="Click to edit threshold"
                          >
                            {product.minimum_stock} <span className="text-[10px]">{product.unit}</span>
                            <Settings2 className="h-3 w-3 opacity-40" />
                          </button>
                        </TableCell>

                        {/* Health bar */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full transition-all ${barColor}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-muted-foreground">{pct}% of target</p>
                          </div>
                        </TableCell>

                        {/* Deliveries */}
                        <TableCell className="text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleViewProductOrders(product.id, product.name)}
                                className="font-semibold text-xs text-primary hover:underline inline-flex items-center gap-1"
                              >
                                {deliveries}
                                <ArrowRight className="h-3 w-3 opacity-60" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View delivered orders for {product.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>

                        {/* Status */}
                        <TableCell>{statusBadge}</TableCell>

                        {/* Management Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Adjust Stock Button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                                  onClick={() => setAdjustProduct(product)}
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Adjust Stock (Add/Remove)</TooltipContent>
                            </Tooltip>

                            {/* Return Stock Button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-200"
                                  onClick={() => setReturnProduct(product)}
                                >
                                  <CornerUpLeft className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Process Return</TooltipContent>
                            </Tooltip>

                            {/* Min Threshold Button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200"
                                  onClick={() => setThresholdProduct(product)}
                                >
                                  <Settings2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Configure Min Threshold</TooltipContent>
                            </Tooltip>

                            {/* Audit History Button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                  onClick={() => setHistoryProduct(product)}
                                >
                                  <History className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Stock Audit History</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab 2: Stock Audit Log & Movements ── */}
        <TabsContent value="movements" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter by product, SKU, or user..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Movement Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Movement Types</SelectItem>
                  <SelectItem value="purchase">Purchase (Stock In)</SelectItem>
                  <SelectItem value="delivery">Delivery (Stock Out)</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="return">Return</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {movementsLoading ? (
            <TableSkeleton rows={8} cols={6} />
          ) : filteredMovements.length === 0 ? (
            <EmptyState title="No movements found" description="No stock movements match the criteria" icon={<History className="h-12 w-12" />} />
          ) : (
            <Card className="border shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Movement Type</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Recorded By</TableHead>
                    <TableHead>Date & Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.map((m) => {
                    const typeStr = m.movement_type?.toString().replace("_", "") === "return_" ? "return" : m.movement_type?.toString();
                    const meta = MOVEMENT_META[typeStr] ?? MOVEMENT_META["adjustment"];
                    const isPositive = m.quantity > 0;
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 font-semibold text-xs px-2.5 py-1 rounded-full border ${meta.color}`}>
                            {meta.icon}
                            {meta.label}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{m.product_name || `Product #${m.product_id}`}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{m.sku || "-"}</TableCell>
                        <TableCell className="text-right font-bold text-sm">
                          <span className={isPositive ? "text-emerald-600" : "text-destructive"}>
                            {isPositive ? "+" : ""}{m.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.created_by_username ? <strong>{m.created_by_username}</strong> : "System"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDateTime(m.created_at)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab 3: Customer Orders & Reservations ── */}
        <TabsContent value="orders" className="space-y-4">
          <OrdersManagementView
            productIdFilter={selectedProductId}
            productNameFilter={selectedProductName}
            onClearProductFilter={() => {
              setSelectedProductId(undefined);
              setSelectedProductName(undefined);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* ── Dialog Modals ── */}
      <Dialog open={!!adjustProduct} onOpenChange={(open) => !open && setAdjustProduct(null)}>
        {adjustProduct && (
          <AdjustDialog product={adjustProduct} onClose={() => setAdjustProduct(null)} />
        )}
      </Dialog>

      <Dialog open={!!returnProduct} onOpenChange={(open) => !open && setReturnProduct(null)}>
        {returnProduct && (
          <ReturnDialog product={returnProduct} onClose={() => setReturnProduct(null)} />
        )}
      </Dialog>

      <Dialog open={!!thresholdProduct} onOpenChange={(open) => !open && setThresholdProduct(null)}>
        {thresholdProduct && (
          <ThresholdDialog product={thresholdProduct} onClose={() => setThresholdProduct(null)} />
        )}
      </Dialog>

      <Dialog open={!!historyProduct} onOpenChange={(open) => !open && setHistoryProduct(null)}>
        {historyProduct && (
          <HistoryDialog
            product={historyProduct}
            movements={movements as StockMovement[]}
            onClose={() => setHistoryProduct(null)}
          />
        )}
      </Dialog>
    </div>
  );
}
