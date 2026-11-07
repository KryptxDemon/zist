import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Library as LibraryIcon, Plus, Trash } from "lucide-react-native";

import { useTheme } from "@/theme";
import { mediaService } from "@/services/mediaService";
import { parseTimestamp } from "@/lib/time";
import type { MediaItem, MediaStatus, MediaType } from "@/types";
import {
  ActionSheet,
  Button,
  ChipSelect,
  ConfirmDialog,
  EmptyState,
  MediaCardSkeleton,
  Screen,
  SearchInput,
  Segmented,
  Select,
  Text,
  useToast,
  type SelectOption,
  type TabItem,
} from "@/components/ui";
import { PageHeader } from "@/components/layout/AppHeader";
import { MediaGridCard } from "@/components/library/MediaGridCard";

type SortOption = "recent" | "title" | "themes" | "vocab";

const GAP = 12;
const H_PADDING = 16;

const TYPE_OPTIONS: SelectOption<MediaType>[] = [
  { value: "movie", label: "Movies" },
  { value: "tv", label: "TV Shows" },
  { value: "book", label: "Books" },
  { value: "documentary", label: "Documentaries" },
  { value: "podcast", label: "Podcasts" },
  { value: "game", label: "Games" },
];

const STATUS_TABS: TabItem<MediaStatus | "all">[] = [
  { value: "all", label: "All" },
  { value: "planned", label: "Planned" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const SORT_OPTIONS: SelectOption<SortOption>[] = [
  { value: "recent", label: "Recently Added" },
  { value: "title", label: "Title A-Z" },
  { value: "themes", label: "Most Themes" },
  { value: "vocab", label: "Most Vocab" },
];

/** Native port of the web `Library` page. */
export function LibraryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { toast } = useToast();
  const params = useLocalSearchParams<{ theme?: string }>();
  const { width } = useWindowDimensions();

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<MediaType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<MediaStatus | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [menuItem, setMenuItem] = useState<MediaItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MediaItem | null>(null);

  // Two columns on phones, three once there is room (large phones, tablets,
  // and the web build on a desktop window).
  const columns = width >= 700 ? 3 : 2;
  const cardWidth = (width - H_PADDING * 2 - GAP * (columns - 1)) / columns;

  const loadMedia = useCallback(
    async (showSkeleton = false) => {
      if (showSkeleton) setIsLoading(true);
      try {
        const data = await mediaService.getAll();
        setMedia(data);
      } catch (error) {
        // Kept identical to the web's `console.error` so a failing request is
        // visible in the Metro log — the toast is deliberately generic.
        console.error("Failed to load media:", error);
        toast({
          title: "Could not load library",
          description: "Please refresh or try again in a moment.",
          variant: "destructive",
        });
      } finally {
        if (showSkeleton) setIsLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    void loadMedia(true);
  }, [loadMedia]);

  // A `?theme=` param (e.g. from the dashboard) prefills the search box.
  useEffect(() => {
    const theme = params.theme;
    if (typeof theme === "string" && theme.trim()) {
      setSearchQuery(theme);
    }
  }, [params.theme]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadMedia();
    setIsRefreshing(false);
  }, [loadMedia]);

  const filteredMedia = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return media
      .filter((item) => {
        const tags = Array.isArray(item.tags) ? item.tags : [];
        const title = item.title?.toLowerCase?.() ?? "";
        const creator = item.creator?.toLowerCase?.() ?? "";

        if (searchQuery.trim()) {
          if (
            !title.includes(query) &&
            !creator.includes(query) &&
            !tags.some((tag) => tag.toLowerCase().includes(query))
          ) {
            return false;
          }
        }
        if (typeFilter !== "all" && item.type !== typeFilter) return false;
        if (statusFilter !== "all" && item.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "title") return a.title.localeCompare(b.title);
        // "themes"/"vocab" fall back to recency, matching the web page.
        return (
          (parseTimestamp(b.createdAt)?.getTime() ?? 0) -
          (parseTimestamp(a.createdAt)?.getTime() ?? 0)
        );
      });
  }, [media, searchQuery, typeFilter, statusFilter, sortBy]);

  const hasFilters =
    searchQuery.trim().length > 0 || typeFilter !== "all" || statusFilter !== "all";

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      await mediaService.delete(target.id);
      setMedia((prev) => prev.filter((item) => item.id !== target.id));
      toast({ title: "Media deleted", description: `"${target.title}" was removed.` });
    } catch (error) {
      toast({
        title: "Could not delete media",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  }, [pendingDelete, toast]);

  const renderGrid = () => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
      {isLoading
        ? Array.from({ length: 6 }).map((_, index) => (
            <View key={`skeleton-${index}`} style={{ width: cardWidth }}>
              <MediaCardSkeleton />
            </View>
          ))
        : filteredMedia.map((item) => (
            <MediaGridCard
              key={item.id}
              media={item}
              width={cardWidth}
              onPress={() => router.push({ pathname: "/media/[id]", params: { id: item.id } })}
              onLongPress={() => setMenuItem(item)}
            />
          ))}
    </View>
  );

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <PageHeader
        title="Library"
        subtitle={`${media.length} items in your collection`}
        action={
          <Button
            label="Add Media"
            icon={<Plus size={16} color={colors.primaryForeground} />}
            onPress={() => router.push("/add")}
          />
        }
      />

      <View style={{ gap: 10 }}>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by title, creator, or tags..."
        />

        <ChipSelect<MediaType>
          value={typeFilter}
          onChange={(next) => setTypeFilter(next)}
          options={TYPE_OPTIONS}
          allLabel="All Types"
        />

        <Segmented<MediaStatus | "all">
          value={statusFilter}
          onChange={setStatusFilter}
          items={STATUS_TABS}
        />

        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
          <Select<SortOption>
            value={sortBy}
            onChange={setSortBy}
            options={SORT_OPTIONS}
            label="Sort by"
            style={{ minWidth: 160 }}
          />
        </View>
      </View>

      {isLoading ? (
        renderGrid()
      ) : filteredMedia.length === 0 ? (
        <EmptyState
          icon={<LibraryIcon size={28} color={colors.mutedForeground} />}
          title={media.length === 0 ? "No media yet" : "No media found"}
          description={
            hasFilters
              ? "Try adjusting your search or filters."
              : "Add your first movie, book, or show to start learning."
          }
          action={
            <Button
              label="Add Media"
              icon={<Plus size={16} color={colors.primaryForeground} />}
              onPress={() => router.push("/add")}
            />
          }
        />
      ) : (
        renderGrid()
      )}

      <ActionSheet
        visible={menuItem !== null}
        onClose={() => setMenuItem(null)}
        title={menuItem?.title}
        actions={[
          {
            label: "Open",
            onPress: () => {
              if (menuItem) {
                router.push({ pathname: "/media/[id]", params: { id: menuItem.id } });
              }
            },
          },
          {
            label: "Delete",
            destructive: true,
            icon: <Trash size={18} color={colors.destructive} />,
            onPress: () => setPendingDelete(menuItem),
          },
        ]}
      />

      <ConfirmDialog
        visible={pendingDelete !== null}
        title="Delete media?"
        description={
          pendingDelete
            ? `"${pendingDelete.title}" and all of its themes, vocab, and notes will be removed.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Screen>
  );
}
