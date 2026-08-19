import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LayoutDashboard, Package, Tags, Truck, Store, ShoppingCart,
  ClipboardList, BarChart3, Shield, Menu, X, Sun, Moon,
  LogOut, ChevronDown, Bell, Warehouse, FileText, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: <LayoutDashboard className="h-4 w-4" />, roles: ["admin"] },
  { label: "Products", href: "/admin/products", icon: <Package className="h-4 w-4" />, roles: ["admin"] },
  { label: "Categories", href: "/admin/categories", icon: <Tags className="h-4 w-4" />, roles: ["admin"] },
  { label: "Suppliers", href: "/admin/suppliers", icon: <Truck className="h-4 w-4" />, roles: ["admin"] },
  { label: "Markets", href: "/admin/markets", icon: <Store className="h-4 w-4" />, roles: ["admin"] },
  { label: "Orders", href: "/admin/orders", icon: <ShoppingCart className="h-4 w-4" />, roles: ["admin"] },
  { label: "Deliveries", href: "/admin/deliveries", icon: <ClipboardList className="h-4 w-4" />, roles: ["admin"] },
  { label: "Analytics", href: "/admin/analytics", icon: <BarChart3 className="h-4 w-4" />, roles: ["admin"] },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: <Shield className="h-4 w-4" />, roles: ["admin"] },
  { label: "Reports", href: "/admin/reports", icon: <FileText className="h-4 w-4" />, roles: ["admin"] },
  { label: "Settings", href: "/admin/settings", icon: <Settings className="h-4 w-4" />, roles: ["admin"] },
  { label: "Dashboard", href: "/market", icon: <LayoutDashboard className="h-4 w-4" />, roles: ["market"] },
  { label: "Products", href: "/market/products", icon: <Package className="h-4 w-4" />, roles: ["market"] },
  { label: "Place Order", href: "/market/cart", icon: <ShoppingCart className="h-4 w-4" />, roles: ["market"] },
  { label: "My Orders", href: "/market/orders", icon: <ClipboardList className="h-4 w-4" />, roles: ["market"] },
  { label: "Dashboard", href: "/warehouse", icon: <Warehouse className="h-4 w-4" />, roles: ["warehouse"] },
  { label: "Orders", href: "/warehouse/orders", icon: <ClipboardList className="h-4 w-4" />, roles: ["warehouse"] },
  { label: "Deliveries", href: "/warehouse/deliveries", icon: <Truck className="h-4 w-4" />, roles: ["warehouse"] },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredNav = navItems.filter((item) => item.roles.includes(user?.role || ""));

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2 px-6 border-b border-sidebar-border">
          <Store className="h-6 w-6 text-blue-400" />
          <span className="text-lg font-bold">Djaber</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
          <div className="space-y-1">
            {filteredNav.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== "/admin" && item.href !== "/market" && item.href !== "/warehouse" && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-background px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {user?.username?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start text-left">
                    <span className="text-sm font-medium">{user?.username}</span>
                    <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
