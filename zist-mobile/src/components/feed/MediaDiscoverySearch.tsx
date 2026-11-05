import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { AlertCircle, LibraryBig, Search, X } from "lucide-react-native";

import { useTheme } from "@/theme";
import type { MediaStatus } from "@/types";
import { Button, Input, Sheet, Spinner, Text, useToast } from "@/components/ui";
import { mediaService } from "@/services/mediaService";
import { mediaSearchService } from "@/services/externalServices";
import {
  MediaPreviewSheet,
  MediaResultCard,
  type MediaResultItem,
} from "./MediaResultCard";

/**
 * Discovery search used by the Feed. Searches the external media catalog
 * (TMDb + OpenLibrary) through the same `/external/search/media` endpoint the
 * Add screen uses, and delegates Preview / Autofill / Add to `mediaService` so
 * the search pipeline is never duplicated.
 *
 * Ported from `zist-frontend/src/components/feed/MediaDiscoverySearch.tsx`.
 * The web rendered results in an absolutely-positioned dropdown; on mobile the
 * trigger opens a `<Sheet>` (the app's replacement for dropdowns) containing its
 * own search field, which keeps the keyboard usable while results are visible.
 *
 * States: initial · typing · loading · results · empty · error. Stale requests
 * are cancelled with a request-id counter. Items already in the library are
 * tagged "In library" and have their Add button disabled.
 */

export interface MediaDiscoverySearchProps {
  placeholder?: string;
  defaultStatus?: MediaStatus;
  /**
   * Optional controlled value. When provided, the component renders in
   * controlled mode and `onQueryChange` must also be provided.
   */
  value?: string;
  onQueryChange?: (value: string) => void;
  style?: ViewStyle;
}

interface SavedKey {
  source: string;
  id: string;
}

const savedKey = (k: SavedKey) => `${k.source}::${k.id}`;

const matchesSaved = (item: MediaResultItem, saved: Set<string>): boolean => {
  if (!item.external_source || !item.external_id) return false;
  return saved.has(`${item.external_source}::${item.external_id}`);
};

export function MediaDiscoverySearch({
  placeholder = "Search movies, books, TV shows…",
  defaultStatus = "planned",
  value,
  onQueryChange,
  style,
}: MediaDiscoverySearchProps) {
  const router = useRouter();
  const { colors, radius } = useTheme();
  const { toast } = useToast();

  const isControlled = value !== undefined;
  const [internalQuery, setInternalQuery] = useState("");
  const query = isControlled ? (value as string) : internalQuery;
  const setQuery = (next: string) => {
    if (!isControlled) setInternalQuery(next);
    onQueryChange?.(next);
  };

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moviesTv, setMoviesTv] = useState<MediaResultItem[]>([]);
  const [books, setBooks] = useState<MediaResultItem[]>([]);
  const [activeQuery, setActiveQuery] = useState("");
  const [addingItem, setAddingItem] = useState<MediaResultItem | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaResultItem | null>(null);
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());

  const requestIdRef = useRef(0);

  // Load the user's library once when the sheet first opens so items already in
  // the library can be marked. Re-loaded after a successful Add (badge update).
  const loadLibrarySnapshot = async () => {
    try {
      const { items } = await mediaService.getAllWithMeta(1, 100);
      const set = new Set<string>();
      for (const m of items) {
        const source = (m as unknown as { externalSource?: string }).externalSource;
        const id = (m as unknown as { externalId?: string }).externalId;
        if (source && id) {
          set.add(savedKey({ source, id }));
        }
      }
      setSavedSet(set);
    } catch (err) {
      // Silent failure — the dedup badge is non-essential. The Add button will
      // surface a backend error if the user actually re-adds an item.
      console.warn("Failed to load library snapshot for dedup:", err);
    }
  };

  useEffect(() => {
    if (isOpen && savedSet.size === 0) {
      void loadLibrarySnapshot();
    }
    // Intentionally only depends on `isOpen` so the snapshot loads once per
    // session and re-loads only after a successful Add.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Debounced search — 350ms after the last keystroke. Empty queries reset the
  // panel to its initial state.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setIsLoading(false);
      setError(null);
      setMoviesTv([]);
      setBooks([]);
      setActiveQuery("");
      return;
    }

    const currentId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    const handle = setTimeout(async () => {
      try {
        const result = await mediaSearchService.searchMediaGrouped(trimmed);
        if (currentId !== requestIdRef.current) return; // stale
        setActiveQuery(trimmed);
        setMoviesTv(result.moviesTv || []);
        setBooks(result.books || []);
      } catch (err) {
        if (currentId !== requestIdRef.current) return;
        setError(
          err instanceof Error ? err.message : "Couldn't search right now. Please try again.",
        );
        setMoviesTv([]);
        setBooks([]);
      } finally {
        if (currentId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }, 350);

    return () => clearTimeout(handle);
  }, [query]);

  const handleClear = () => {
    setQuery("");
    setError(null);
    setMoviesTv([]);
    setBooks([]);
    setActiveQuery("");
  };

  const handleAdd = async (item: MediaResultItem) => {
    setAddingItem(item);
    try {
      const media = await mediaService.create({
        title: item.title,
        type: item.type,
        year: item.year ?? undefined,
        creator: item.creator ?? undefined,
        description: item.description ?? undefined,
        coverUrl: item.cover_url ?? undefined,
        status: defaultStatus,
        externalSource: item.external_source ?? undefined,
        externalId: item.external_id ?? undefined,
      });
      toast({
        title: "Added to library",
        description: `${item.title} is now in your library.`,
      });
      if (item.external_source && item.external_id) {
        setSavedSet((prev) =>
          new Set(prev).add(
            savedKey({ source: item.external_source!, id: item.external_id! }),
          ),
        );
      }
      // Close the overlays before navigating so the modal never lingers.
      setPreviewItem(null);
      setIsOpen(false);
      router.push(`/media/${media.id}`);
    } catch (err) {
      toast({
        title: "Failed to add",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingItem(null);
    }
  };

  // On the Feed there is no Add form to autofill, so "Autofill" opens the rich
  // preview sheet — exactly like the web page does.
  const handleAutofill = (item: MediaResultItem) => setPreviewItem(item);
  const handlePreview = (item: MediaResultItem) => setPreviewItem(item);

  const totalResults = moviesTv.length + books.length;
  const hasQuery = query.trim().length > 0;

  const panelState = useMemo(() => {
    if (!hasQuery) return "initial";
    if (isLoading) return "loading";
    if (error) return "error";
    if (totalResults === 0) return "empty";
    return "results";
  }, [hasQuery, isLoading, error, totalResults]);

  const renderSection = (title: string, items: MediaResultItem[], isBook: boolean) => (
    <View style={{ gap: 8 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text variant="caption" uppercase letterSpacing={1.5}>
          {title}
        </Text>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: colors.primary + "1a",
          }}
        >
          <Text variant="caption" tint={colors.primary}>
            {items.length}
          </Text>
        </View>
      </View>
      {items.slice(0, 8).map((item, idx) => (
        <MediaResultCard
          key={`${isBook ? "book" : "mt"}-${item.external_source || "ext"}-${item.external_id || item.title}-${idx}`}
          item={item}
          isBook={isBook}
          isAdding={
            addingItem?.external_id === item.external_id &&
            addingItem?.external_source === item.external_source
          }
          isAlreadySaved={matchesSaved(item, savedSet)}
          onPreview={handlePreview}
          onAutofill={handleAutofill}
          onAdd={handleAdd}
        />
      ))}
    </View>
  );

  return (
    <View style={style}>
      {/* Trigger — styled like a search field, opens the discovery sheet. */}
      <Pressable
        onPress={() => setIsOpen(true)}
        accessibilityRole="search"
        accessibilityLabel="Search movies, books, and TV shows"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          height: 44,
          paddingHorizontal: 12,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
        }}
      >
        <Search size={16} color={colors.mutedForeground} />
        <Text
          variant="small"
          numberOfLines={1}
          style={{ flex: 1 }}
          tint={query ? colors.foreground : colors.inputPlaceholder}
        >
          {query || placeholder}
        </Text>
        {query ? (
          <Pressable
            onPress={handleClear}
            hitSlop={10}
            accessibilityLabel="Clear search"
          >
            <X size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </Pressable>

      <Sheet
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        presentation="sheet"
        title="Discover media"
        description="Search the catalog and add titles straight to your library."
        maxHeightRatio={0.9}
      >
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          icon={<Search size={16} color={colors.mutedForeground} />}
          trailing={
            query ? (
              <Pressable onPress={handleClear} hitSlop={10} accessibilityLabel="Clear search">
                <X size={16} color={colors.mutedForeground} />
              </Pressable>
            ) : undefined
          }
        />

        {panelState === "initial" ? (
          <View style={{ alignItems: "center", gap: 6, paddingVertical: 32 }}>
            <LibraryBig size={24} color={colors.mutedForeground} />
            <Text variant="small" color="mutedForeground" align="center">
              Start typing to search movies, books, and TV shows.
            </Text>
          </View>
        ) : null}

        {panelState === "loading" ? <Spinner label={`Searching for "${query.trim()}"…`} /> : null}

        {panelState === "error" ? (
          <View style={{ flexDirection: "row", gap: 8, paddingVertical: 24, alignItems: "flex-start" }}>
            <AlertCircle size={16} color={colors.destructive} />
            <Text variant="small" tint={colors.destructive} style={{ flex: 1 }}>
              {error}
            </Text>
          </View>
        ) : null}

        {panelState === "empty" ? (
          <View style={{ alignItems: "center", gap: 6, paddingVertical: 32 }}>
            <LibraryBig size={24} color={colors.mutedForeground} />
            <Text variant="small" color="mutedForeground" align="center">
              {`No media found for "${activeQuery || query.trim()}".`}
            </Text>
            <Text variant="caption" align="center">
              Try a different title, or check spelling.
            </Text>
          </View>
        ) : null}

        {panelState === "results" ? (
          <View style={{ gap: 16 }}>
            {moviesTv.length > 0 ? renderSection("Movies & TV", moviesTv, false) : null}
            {books.length > 0 ? renderSection("Books", books, true) : null}
          </View>
        ) : null}

        {panelState === "results" ? (
          <Button variant="outline" label="Close" fullWidth onPress={() => setIsOpen(false)} />
        ) : null}
      </Sheet>

      <MediaPreviewSheet
        item={previewItem}
        isAdding={
          !!previewItem &&
          addingItem?.external_id === previewItem.external_id &&
          addingItem?.external_source === previewItem.external_source
        }
        isAlreadySaved={!!previewItem && matchesSaved(previewItem, savedSet)}
        onClose={() => setPreviewItem(null)}
        onAutofill={handleAutofill}
        onAdd={handleAdd}
      />
    </View>
  );
}

export const discoveryStyles = StyleSheet.create({});
