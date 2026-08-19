import { useState } from "react";
import { useAuditLogs } from "@/hooks";
import { PageHeader, Pagination, TableSkeleton, EmptyState } from "@/components/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Search } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");

  const { data, isLoading } = useAuditLogs({
    page,
    page_size: 30,
    action: actionFilter || undefined,
    entity_type: entityFilter || undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="Track all system activities" />

      <div className="flex flex-col gap-4 sm:flex-row">
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {["create", "update", "delete", "login", "approve", "reject", "prepare", "deliver"].map((a) => (
              <SelectItem key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Entities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {["user", "product", "category", "supplier", "market", "order", "delivery", "stock", "auth"].map((e) => (
              <SelectItem key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <TableSkeleton rows={8} cols={5} /> : !data?.items || data.items.length === 0 ? (
        <EmptyState title="No audit logs" description="System activities will be logged here" icon={<Shield className="h-12 w-12" />} />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.username || `User #${log.user_id}`}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell>{log.entity_type}</TableCell>
                    <TableCell className="font-mono text-sm">{log.entity_id || "-"}</TableCell>
                    <TableCell>{formatDateTime(log.created_at)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{log.ip_address || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
