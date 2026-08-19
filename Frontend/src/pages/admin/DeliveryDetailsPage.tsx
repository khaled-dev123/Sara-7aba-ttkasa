import { useParams, Link } from "react-router-dom";
import { useDeliveries, useCompleteDelivery } from "@/hooks";
import { deliveryApi } from "@/api";
import { PageHeader, PageSkeleton, StatusBadge } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Timeline } from "@/components/ui/timeline";
import { ArrowLeft, Download, CheckCircle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function DeliveryDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const deliveryId = Number(id);
  const { data: deliveries, isLoading } = useDeliveries();
  const completeMutation = useCompleteDelivery();

  const delivery = deliveries?.find((d) => d.id === deliveryId);

  if (isLoading) return <PageSkeleton />;
  if (!delivery) return <div className="p-8 text-center text-muted-foreground">Delivery not found</div>;

  const timelineSteps = [
    { label: "Prepared", status: "completed" as const, timestamp: formatDateTime(delivery.created_at) },
    { label: "On Route", status: delivery.status === "prepared" ? "current" as const : "completed" as const },
    { label: "Delivered", status: delivery.status === "delivered" ? "completed" as const : "pending" as const },
  ];

  const handleComplete = async () => {
    await completeMutation.mutateAsync(deliveryId);
  };

  const handleDownloadPdf = () => {
    const token = localStorage.getItem("access_token");
    fetch(deliveryApi.pdfUrl(deliveryId), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `delivery-${delivery.order_number || deliveryId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/deliveries"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <PageHeader
          title={`Delivery #${delivery.id}`}
          description={`${delivery.market_name || "Unknown"} - ${formatDateTime(delivery.created_at)}`}
          actions={
            <div className="flex gap-2">
              <StatusBadge status={delivery.status} />
              {delivery.pdf_path && (
                <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                  <Download className="mr-2 h-4 w-4" /> PDF
                </Button>
              )}
            </div>
          }
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Delivery Information</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-muted-foreground">Order</dt><dd className="font-medium">{delivery.order_number || `#${delivery.order_id}`}</dd></div>
                <div><dt className="text-muted-foreground">Market</dt><dd className="font-medium">{delivery.market_name || "-"}</dd></div>
                <div><dt className="text-muted-foreground">Status</dt><dd><StatusBadge status={delivery.status} /></dd></div>
                <div><dt className="text-muted-foreground">Date</dt><dd className="font-medium">{formatDateTime(delivery.delivery_date || delivery.created_at)}</dd></div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Product List</CardTitle></CardHeader>
            <CardContent>
              {delivery.items && delivery.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product ID</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {delivery.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">Product #{item.product_id}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No items</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Delivery Timeline</CardTitle></CardHeader>
            <CardContent>
              <Timeline steps={timelineSteps} />
            </CardContent>
          </Card>

          {delivery.status !== "delivered" && (
            <Card>
              <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
              <CardContent>
                <Button className="w-full" onClick={handleComplete} disabled={completeMutation.isPending}>
                  <CheckCircle className="mr-2 h-4 w-4" /> Mark as Delivered
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
