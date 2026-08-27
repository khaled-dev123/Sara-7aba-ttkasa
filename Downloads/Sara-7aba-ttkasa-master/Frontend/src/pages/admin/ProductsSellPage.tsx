import { useState } from "react";
import { Link } from "react-router-dom";
import { useProducts, useOrders } from "@/hooks";
import { type ProductDetail } from "@/types";
import { PageHeader, TableSkeleton, EmptyState } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { OrdersManagementView } from "@/components/admin/OrdersManagementView";
import { Package, Search, CircleCheck, AlertTriangle, CircleX, ShoppingCart, Clock, ArrowRight } from "lucide-react";

type StockStatus = "in" | "low" | "out";

function getStatus(p: ProductDetail): StockStatus {
  if (p.current_stock <= 0) return "out";
  if (p.current_stock <= p.minimum_stock) return "low";
  return "in";
}

const STATUS_META: Record<StockStatus, { label: string; badge: string; bar: string }> = {
  in: { label: "In Stock", badge: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400", bar: "bg-emerald-500" },
  low: { label: "Low Stock", badge: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400", bar: "bg-amber-500" },
  out: { label: "Out of Stock", badge: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-400", bar: "bg-red-500" },
};

interface ReservedCellProps {
  product: ProductDetail;
  onViewProductOrders: (productId: number, productName: string) => void;
}

function ReservedCell({ product, onViewProductOrders }: ReservedCellProps) {
  const reserved = product.reserved_stock ?? 0;
  const byMarket = product.reserved_by_market ?? [];
  if (reserved <= 0) return <span className="text-muted-foreground">0</span>;
  return (
    <div className="flex flex-col items-end gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onViewProductOrders(product.id, product.name)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950/50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-400 hover:bg-amber-200 transition-colors"
          >
            <ShoppingCart className="h-3 w-3" />
            {reserved} pending
            <ArrowRight className="h-3 w-3 opacity-60" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="mb-1 font-semibold">Pending approval (click to view orders)</p>
          {byMarket.length > 0 ? (
            <ul className="space-y-0.5">
              {byMarket.map((m) => (
                <li key={m.market_id} className="flex items-center justify-between gap-4">
                  <span>{m.market_name}</span>
                  <span className="font-mono">{m.quantity}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>Pending orders awaiting approval</p>
          )}
        </TooltipContent>
      </Tooltip>
      {byMarket.length > 0 && (
        <span className="max-w-[220px] truncate text-xs text-muted-foreground" title={byMarket.map((m) => `${m.market_name} ×${m.quantity}`).join(", ")}>
          {byMarket.map((m) => `${m.market_name} ×${m.quantity}`).join(", ")}
        </span>
      )}
    </div>
  );
}

export default function ProductsSellPage() {
  const [activeTab, setActiveTab] = useState("selling");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined);
  const [selectedProductName, setSelectedProductName] = useState<string | undefined>(undefined);

  const { data, isLoading } = useProducts({ page: 1, page_size: 1000 });
  const { data: pendingOrdersData } = useOrders({ status: "pending", page_size: 1 });
  const { data: allOrdersData } = useOrders({ page_size: 1 });

  const products = data?.items ?? [];
  const pendingOrdersCount = pendingOrdersData?.total ?? 0;
  const totalOrdersCount = allOrdersData?.total ?? 0;

  const filtered = products
    .filter((p) => p.is_active)
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => statusFilter === "all" || getStatus(p) === statusFilter);

  const counts = {
    in: products.filter((p) => p.is_active && getStatus(p) === "in").length,
    low: products.filter((p) => p.is_active && getStatus(p) === "low").length,
    out: products.filter((p) => p.is_active && getStatus(p) === "out").length,
  };

  const handleViewProductOrders = (productId: number, productName: string) => {
    setSelectedProductId(productId);
    setSelectedProductName(productName);
    setActiveTab("orders");
  };

  const stats = [
    { label: "Available for Sale", value: counts.in, icon: <CircleCheck className="h-5 w-5" />, color: "text-emerald-600" },
    { label: "Low Stock", value: counts.low, icon: <AlertTriangle className="h-5 w-5" />, color: "text-amber-600" },
    { label: "Out of Stock", value: counts.out, icon: <CircleX className="h-5 w-5" />, color: "text-red-600" },
    {
      label: "Pending Customer Orders",
      value: pendingOrdersCount,
      icon: <Clock className="h-5 w-5" />,
      color: "text-blue-600",
      highlight: pendingOrdersCount > 0,
      onClick: () => setActiveTab("orders"),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products (Sell)"
        description="Live selling status & customer orders management — view live inventory, track pending reservations, and approve orders"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className={`transition-all ${stat.onClick ? "cursor-pointer hover:border-primary/50" : ""} ${stat.highlight ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20" : ""}`}
            onClick={stat.onClick}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <div className={stat.color}>{stat.icon}</div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
                {stat.highlight && (
                  <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400 text-xs">
                    Requires Action
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="selling" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span>Selling Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2 relative">
              <ShoppingCart className="h-4 w-4" />
              <span>All Orders</span>
              {pendingOrdersCount > 0 ? (
                <Badge className="ml-1.5 h-5 px-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded-full">
                  {pendingOrdersCount}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">({totalOrdersCount})</span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Products Selling Status */}
        <TabsContent value="selling" className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="in">In Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <TableSkeleton rows={5} cols={8} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No products found"
              description="Add products in the Buy page to see their selling status here"
              icon={<Package className="h-12 w-12" />}
            />
          ) : (
            <Card className="border shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">In Stock</TableHead>
                    <TableHead className="text-right">Pending Orders</TableHead>
                    <TableHead className="text-right">Available for Sale</TableHead>
                    <TableHead className="w-[160px]">Stock Level</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((product) => {
                    const status = getStatus(product);
                    const meta = STATUS_META[status];
                    const reserved = product.reserved_stock ?? 0;
                    const available = Math.max(product.current_stock - reserved, 0);
                    const target = Math.max(product.minimum_stock * 2, 1);
                    const pct = Math.min(100, Math.round((product.current_stock / target) * 100));

                    return (
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
                            <Link to={`/admin/products/${product.id}`} className="hover:underline text-primary">
                              {product.name}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                        <TableCell className="text-sm">{product.category_name || "-"}</TableCell>
                        <TableCell className="text-right font-medium">
                          <span className={status !== "in" ? (status === "out" ? "text-red-600 font-bold" : "text-amber-600 font-bold") : ""}>
                            {product.current_stock}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">/ min {product.minimum_stock} {product.unit}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <ReservedCell product={product} onViewProductOrders={handleViewProductOrders} />
                        </TableCell>
                        <TableCell className={`text-right font-bold ${available === 0 ? "text-red-600" : "text-emerald-600"}`}>
                          {available} <span className="text-xs font-normal text-muted-foreground">{product.unit}</span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div className={`h-full rounded-full transition-all ${meta.bar}`} style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-[10px] text-muted-foreground">{pct}% of target</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.badge}`}>
                            {meta.label}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: All Orders View */}
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
    </div>
  );
}
