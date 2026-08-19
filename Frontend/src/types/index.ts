export type UserRole = "admin" | "market" | "warehouse";
export type OrderStatus = "pending" | "approved" | "prepared" | "on_route" | "delivered" | "rejected";
export type DeliveryStatus = "prepared" | "on_route" | "delivered";

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface UserWithMarket extends User {
  market_id: number | null;
  market_name: string | null;
}

export interface TokenPair {
  access_token: string;
  token_type: string;
  refresh_token: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
}

export interface ProductDetail {
  id: number;
  name: string;
  sku: string;
  category_id: number;
  supplier_id: number;
  category_name: string | null;
  supplier_name: string | null;
  purchase_price: number;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Market {
  id: number;
  name: string;
  address: string;
  phone: string;
  manager_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  product_name: string | null;
  sku: string | null;
  unit: string | null;
}

export interface OrderDetail {
  id: number;
  order_number: string;
  market_id: number;
  status: OrderStatus;
  requested_at: string;
  approved_at: string | null;
  approved_by: number | null;
  notes: string;
  items: OrderItem[];
  market_name: string | null;
  market_phone: string | null;
  approved_by_username: string | null;
  delivery_id: number | null;
}

export interface DeliveryItem {
  id: number;
  product_id: number;
  quantity: number;
}

export interface DeliveryDetail {
  id: number;
  order_id: number;
  delivery_date: string;
  status: DeliveryStatus;
  prepared_by: number | null;
  delivered_by: number | null;
  pdf_path: string | null;
  created_at: string;
  items: DeliveryItem[];
  order_number: string | null;
  market_name: string | null;
}

export interface DashboardSummary {
  total_products: number;
  total_markets: number;
  total_stock: number;
  pending_orders: number;
  approved_orders: number;
  low_stock_count: number;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface LowStockItem {
  product_id: number;
  product_name: string;
  sku: string;
  current_stock: number;
  minimum_stock: number;
  shortfall: number;
}

export interface MostRequestedProduct {
  product_id: number;
  product_name: string;
  sku: string;
  total_quantity: number;
  order_count: number;
}

export interface OrdersPerMarket {
  market_id: number;
  market_name: string;
  total_orders: number;
  pending: number;
  approved: number;
  prepared: number;
  on_route: number;
  delivered: number;
  rejected: number;
}

export interface MonthlyDistribution {
  year: number;
  month: number;
  total_orders: number;
  total_quantity: number;
  items: { product_id: number; product_name: string; sku: string; total_quantity: number }[];
}

export interface StockLevel {
  product_id: number;
  product_name: string;
  sku: string;
  current_stock: number;
  minimum_stock: number;
  is_low_stock: boolean;
}

export interface ProductAnalytics {
  most_requested: MostRequestedProduct[];
  least_requested: MostRequestedProduct[];
  monthly_distribution: MonthlyDistribution;
  stock_levels: StockLevel[];
}

export interface MarketAnalytics {
  orders_per_market: OrdersPerMarket[];
  most_active: OrdersPerMarket[];
  monthly_activity: { market_id: number; market_name: string; total_orders: number }[];
  total_distributed: { market_id: number; market_name: string; total_quantity: number }[];
}

export interface StockMovement {
  id: number;
  product_id: number;
  product_name: string | null;
  sku: string | null;
  movement_type: string;
  quantity: number;
  reference_type: string;
  reference_id: number | null;
  created_by: number | null;
  created_by_username: string | null;
  created_at: string;
}

export interface PurchaseOrderDetail {
  id: number;
  supplier_id: number;
  supplier_name: string | null;
  purchase_number: string;
  status: string;
  purchase_date: string;
  total_cost: number;
  items: { id: number; product_id: number; product_name: string | null; sku: string | null; quantity: number; unit_price: number }[];
}
