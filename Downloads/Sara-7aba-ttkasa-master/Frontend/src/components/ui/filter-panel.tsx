import { type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterPanelProps {
  children: ReactNode;
  onClear?: () => void;
  hasFilters?: boolean;
}

export function FilterPanel({ children, onClear, hasFilters }: FilterPanelProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {children}
      {hasFilters && onClear && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-9">
          <X className="mr-1 h-3 w-3" /> Clear filters
        </Button>
      )}
    </div>
  );
}
