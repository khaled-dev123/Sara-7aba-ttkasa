import { Link } from "react-router-dom";
import { useDeliveries, useCompleteDelivery } from "@/hooks";
import { deliveryApi } from "@/api";
import { PageHeader, TableSkeleton, StatusBadge, useToast } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, CheckCircle, Download } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function WarehouseDeliveriesPage() {
  const { data: deliveries, isLoading } = useDeliveries();
  const completeMutation = useCompleteDelivery();
  const { addToast } = useToast();

  const handleComplete = async (id: number) => {
    try {
      await completeMutation.mutateAsync(id);
      addToast({ title: "Delivery completed" });
    } catch (err: any) {
      addToast({ title: "Error", description: err?.response?.data?.detail || "Failed", variant: "destructive" });
    }
  };

  const handleDownloadPdf = (id: number) => {
    const token = localStorage.getItem("access_token");
    fetch(deliveryApi.pdfUrl(id), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `delivery-${id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Deliveries" description="Track and manage deliveries" />

      {isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : !deliveries || deliveries.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">No deliveries found</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delivery #</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell className="font-medium">#{delivery.id}</TableCell>
                    <TableCell>{delivery.order_number || `#${delivery.order_id}`}</TableCell>
                    <TableCell>{delivery.market_name || "-"}</TableCell>
                    <TableCell>{formatDate(delivery.created_at)}</TableCell>
                    <TableCell><StatusBadge status={delivery.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {delivery.status !== "delivered" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleComplete(delivery.id)} disabled={completeMutation.isPending}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {delivery.pdf_path && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadPdf(delivery.id)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
