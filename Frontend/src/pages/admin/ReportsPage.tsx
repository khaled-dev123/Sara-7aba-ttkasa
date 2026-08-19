import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared";
import { FileText, Package, Store, BarChart3, Download, Eye } from "lucide-react";
import { useProductAnalytics, useMarketAnalytics } from "@/hooks";

const reports = [
  {
    id: "monthly-distribution",
    title: "Monthly Distribution Report",
    description: "Overview of all distributions by month",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    id: "product-report",
    title: "Product Report",
    description: "Product catalog with stock levels",
    icon: <Package className="h-5 w-5" />,
  },
  {
    id: "market-report",
    title: "Market Report",
    description: "Market activity and order summaries",
    icon: <Store className="h-5 w-5" />,
  },
  {
    id: "inventory-report",
    title: "Inventory Report",
    description: "Current stock levels and low stock alerts",
    icon: <FileText className="h-5 w-5" />,
  },
];

export default function ReportsPage() {
  const { data: productAnalytics } = useProductAnalytics();
  const { data: marketAnalytics } = useMarketAnalytics();

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Generate and download reports" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {reports.map((report) => (
          <Card key={report.id}>
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {report.icon}
              </div>
              <div>
                <CardTitle className="text-base">{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="mr-1 h-3 w-3" /> Preview
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="mr-1 h-3 w-3" /> PDF
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="mr-1 h-3 w-3" /> Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
