import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaCardSkeleton } from "@/components/ui/skeleton-cards";
import { EmptyState } from "@/components/ui/empty-state";
import { MediaTypeBadge } from "@/components/ui/media-type-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { mediaService } from "@/services/mediaService";
import { MediaItem, MediaType, MediaStatus } from "@/types";
import {
  Plus,
  Search,
  Filter,
  SortAsc,
  Library as LibraryIcon,
  BookOpen,
  Lightbulb,
  Quote,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SortOption = "recent" | "title" | "themes" | "vocab";

export default function Library() {
  const [searchParams] = useSearchParams();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<MediaType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<MediaStatus | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  useEffect(() => {
    async function loadMedia() {
      setIsLoading(true);
      try {
        const data = await mediaService.getAll();
        setMedia(data);
      } catch (error) {
        console.error("Failed to load media:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadMedia();
  }, []);

  // Filter and sort media
  const filteredMedia = media
    .filter((item) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !item.title.toLowerCase().includes(query) &&
          !item.tags.some((tag) => tag.toLowerCase().includes(query))
        ) {
          return false;
        }
      }
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);
        case "recent":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-20 md:pb-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Library
            </h1>
            <p className="text-muted-foreground mt-1">
              {media.length} items in your collection
            </p>
          </div>
          <Link to="/app/media/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Media
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as MediaType | "all")}
            >
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="movie">Movies</SelectItem>
                <SelectItem value="tv">TV Shows</SelectItem>
                <SelectItem value="book">Books</SelectItem>
                <SelectItem value="documentary">Documentaries</SelectItem>
                <SelectItem value="podcast">Podcasts</SelectItem>
                <SelectItem value="game">Games</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as MediaStatus | "all")}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <SortAsc className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={sortBy}
                  onValueChange={(v) => setSortBy(v as SortOption)}
                >
                  <DropdownMenuRadioItem value="recent">
                    Recently Added
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="title">
                    Title A-Z
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="themes">
                    Most Themes
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="vocab">
                    Most Vocab
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Media Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <MediaCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredMedia.length === 0 ? (
          <EmptyState
            icon={LibraryIcon}
            title="No media found"
            description={
              searchQuery || typeFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your search or filters."
                : "Add your first movie, book, or show to start learning."
            }
            action={
              <Link to="/app/media/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Media
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMedia.map((item) => (
              <MediaCard key={item.id} media={item} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function MediaCard({ media }: { media: MediaItem }) {
  const [stats, setStats] = useState({ themes: 0, vocab: 0, quotes: 0 });

  useEffect(() => {
    async function loadStats() {
      const data = await mediaService.getStats(media.id);
      setStats({ themes: data.themes, vocab: data.vocab, quotes: data.quotes });
    }
    loadStats();
  }, [media.id]);

  return (
    <Link
      to={`/app/media/${media.id}`}
      className="glass grain rounded-2xl overflow-hidden transition-smooth hover:glow-amber hover:border-primary/30 group"
    >
      {/* Cover Image */}
      <div className="aspect-[2/3] relative overflow-hidden">
        {media.coverUrl ? (
          <img
            src={media.coverUrl}
            alt={media.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-accent flex items-center justify-center">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <MediaTypeBadge type={media.type} size="sm" />
        </div>
        <div className="absolute top-3 right-3">
          <StatusBadge status={media.status} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-display font-semibold text-foreground truncate">
            {media.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {media.creator && `${media.creator} • `}
            {media.year}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Lightbulb className="h-3 w-3" />
            {stats.themes}
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {stats.vocab}
          </div>
          <div className="flex items-center gap-1">
            <Quote className="h-3 w-3" />
            {stats.quotes}
          </div>
        </div>

        {/* Tags */}
        {media.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {media.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 bg-accent rounded-full text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
