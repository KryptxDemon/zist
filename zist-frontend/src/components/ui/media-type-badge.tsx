import { MediaType } from "@/types";
import { cn } from "@/lib/utils";
import {
  Film,
  Tv,
  BookOpen,
  FileVideo,
  Headphones,
  Gamepad2,
} from "lucide-react";

const mediaTypeConfig: Record<
  MediaType,
  { icon: typeof Film; label: string; color: string }
> = {
  movie: {
    icon: Film,
    label: "Movie",
    color: "bg-rose-800/20 text-rose-700 border-rose-800/30",
  },
  tv: {
    icon: Tv,
    label: "TV Show",
    color: "bg-purple-800/20 text-purple-700 border-purple-800/30",
  },
  book: {
    icon: BookOpen,
    label: "Book",
    color: "bg-rose-700/20 text-rose-600 border-rose-700/30",
  },
  documentary: {
    icon: FileVideo,
    label: "Documentary",
    color: "bg-slate-600/20 text-slate-600 border-slate-600/30",
  },
  podcast: {
    icon: Headphones,
    label: "Podcast",
    color: "bg-purple-700/20 text-purple-600 border-purple-700/30",
  },
  game: {
    icon: Gamepad2,
    label: "Game",
    color: "bg-pink-700/20 text-pink-600 border-pink-700/30",
  },
};

interface MediaTypeBadgeProps {
  type: MediaType;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

export function MediaTypeBadge({
  type,
  size = "md",
  showIcon = true,
  className,
}: MediaTypeBadgeProps) {
  const config = mediaTypeConfig[type];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        config.color,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className,
      )}
    >
      {showIcon && <Icon className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />}
      {config.label}
    </span>
  );
}

export function getMediaTypeIcon(type: MediaType) {
  return mediaTypeConfig[type].icon;
}
