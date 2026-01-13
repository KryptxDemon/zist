import { MediaType } from '@/types';
import { cn } from '@/lib/utils';
import { Film, Tv, BookOpen, FileVideo, Headphones, Gamepad2 } from 'lucide-react';

const mediaTypeConfig: Record<MediaType, { icon: typeof Film; label: string; color: string }> = {
  movie: { icon: Film, label: 'Movie', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  tv: { icon: Tv, label: 'TV Show', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  book: { icon: BookOpen, label: 'Book', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  documentary: { icon: FileVideo, label: 'Documentary', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  podcast: { icon: Headphones, label: 'Podcast', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  game: { icon: Gamepad2, label: 'Game', color: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30' },
};

interface MediaTypeBadgeProps {
  type: MediaType;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export function MediaTypeBadge({ type, size = 'md', showIcon = true, className }: MediaTypeBadgeProps) {
  const config = mediaTypeConfig[type];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        config.color,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className
      )}
    >
      {showIcon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />}
      {config.label}
    </span>
  );
}

export function getMediaTypeIcon(type: MediaType) {
  return mediaTypeConfig[type].icon;
}
