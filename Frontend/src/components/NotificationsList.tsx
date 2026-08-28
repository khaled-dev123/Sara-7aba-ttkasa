import React from "react";
import { useNotifications, useMarkNotificationRead } from "@/hooks";
import { Button } from "@/components/ui/button";

export default function NotificationsList() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  if (isLoading) return <div className="p-3 text-sm text-muted-foreground">Loading...</div>;
  if (!notifications || notifications.length === 0) return <div className="p-3 text-sm text-muted-foreground">No notifications</div>;

  return (
    <div className="space-y-1">
      {notifications.map((n: any) => (
        <div key={n.id} className={`p-3 border-b hover:bg-muted/50 ${n.is_read ? "opacity-70" : ""}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm">{n.message}</div>
            <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
          </div>
          <div className="flex gap-2 mt-2">
            {!n.is_read && (
              <Button size="sm" onClick={() => markRead.mutate(n.id)}>Mark read</Button>
            )}
            {n.entity_type && n.entity_id && (
              <a className="text-sm ml-auto text-primary" href={`#/admin/orders/${n.entity_id}`}>View</a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
