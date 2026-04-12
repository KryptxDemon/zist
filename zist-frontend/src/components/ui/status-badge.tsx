import { MediaStatus } from "@/types";
import { cn } from "@/lib/utils";

const statusConfig: Record<MediaStatus, { label: string; color: string }> = {
  planned: { label: "Planned", color: "bg-muted text-muted-foreground" },
  "in-progress": { label: "In Progress", color: "bg-primary/20 text-primary" },
  completed: { label: "Completed", color: "bg-purple-700/20 text-purple-700" },
};

interface StatusBadgeProps {
  status: MediaStatus;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({
  status,
  size = "md",
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        config.color,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className,
      )}
    >
      {config.label}
    </span>
  );
}
