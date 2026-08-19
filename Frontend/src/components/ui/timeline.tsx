import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, Clock, AlertCircle, Circle } from "lucide-react";

interface TimelineStep {
  label: string;
  description?: string;
  timestamp?: string;
  status: "completed" | "current" | "pending" | "error";
  icon?: ReactNode;
}

const statusIcons = {
  completed: <CheckCircle className="h-4 w-4 text-green-600" />,
  current: <Clock className="h-4 w-4 text-blue-600" />,
  pending: <Circle className="h-4 w-4 text-muted-foreground" />,
  error: <AlertCircle className="h-4 w-4 text-red-600" />,
};

const statusColors = {
  completed: "bg-green-600",
  current: "bg-blue-600",
  pending: "bg-muted-foreground/30",
  error: "bg-red-600",
};

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="relative space-y-0">
      {steps.map((step, i) => (
        <div key={i} className="relative flex gap-4 pb-8 last:pb-0">
          {i < steps.length - 1 && (
            <div className={cn("absolute left-[7px] top-6 h-full w-0.5", statusColors[step.status])} />
          )}
          <div className="relative z-10 flex h-4 w-4 items-center justify-center">
            {step.icon || statusIcons[step.status]}
          </div>
          <div className="flex-1">
            <p className={cn("text-sm font-medium", step.status === "pending" && "text-muted-foreground")}>
              {step.label}
            </p>
            {step.description && <p className="text-xs text-muted-foreground">{step.description}</p>}
            {step.timestamp && <p className="text-xs text-muted-foreground mt-0.5">{step.timestamp}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
