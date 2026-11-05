import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, Globe, Plus, Rss, Users } from "lucide-react-native";

import { useTheme } from "@/theme";
import {
  Button,
  EmptyState,
  FeedPostSkeleton,
  Screen,
  Segmented,
  Text,
} from "@/components/ui";
import { feedService } from "@/services/feedService";
import type { FeedPost } from "@/types";
import { FeedComposeSheet } from "@/components/feed/FeedComposeSheet";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { MediaDiscoverySearch } from "@/components/feed/MediaDiscoverySearch";

/**
 * Social feed (port of `zist-frontend/src/pages/Feed.tsx`).
 *
 * Global/Friends visibility switch, paged loading, pull-to-refresh and the
 * compose + discovery flows. The post list is a `FlatList` so it can grow
 * unbounded; the header (title, discovery search, filter) scrolls with it.
 */

const PAGE_SIZE = 10;

type FeedFilter = "global" | "friends";

export function FeedScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState<FeedFilter>("global");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  const requestIdRef = useRef(0);

  const load = useCallback(
    async (targetPage: number, mode: "initial" | "refresh" | "more") => {
      const id = ++requestIdRef.current;
      if (mode === "initial") setIsLoading(true);
      if (mode === "refresh") setIsRefreshing(true);
      if (mode === "more") setIsLoadingMore(true);

      try {
        const data = await feedService.getPosts(filter, targetPage, PAGE_SIZE);
        if (id !== requestIdRef.current) return; // a newer request superseded us

        setPosts((prev) => {
          if (mode !== "more") return data.items;
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...data.items.filter((p) => !seen.has(p.id))];
        });
        setTotal(data.total);
        setPage(targetPage);
        setError(null);
      } catch (err) {
        if (id !== requestIdRef.current) return;
        if (mode !== "more") setPosts([]);
        setError(err instanceof Error ? err.message : "Failed to load posts");
      } finally {
        if (id === requestIdRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
          setIsLoadingMore(false);
        }
      }
    },
    [filter],
  );

  // Initial load + reload whenever the visibility filter changes.
  useEffect(() => {
    void load(1, "initial");
  }, [load]);

  const handleRefresh = useCallback(() => {
    void load(1, "refresh");
  }, [load]);

  const hasMore = posts.length < total;

  const handleEndReached = useCallback(() => {
    if (isLoading || isRefreshing || isLoadingMore) return;
    if (!hasMore) return;
    void load(page + 1, "more");
  }, [hasMore, isLoading, isRefreshing, isLoadingMore, load, page]);

  const handlePostUpdate = useCallback((updated: FeedPost) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  const handlePostDelete = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setTotal((t) => Math.max(0, t - 1));
  }, []);

  const handlePostCreated = useCallback(() => {
    void load(1, "refresh");
  }, [load]);

  const header = (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 12 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="h2">Feed</Text>
            <Text variant="muted">
              Share quotes, themes, and vocabulary with your take on them
            </Text>
          </View>
          <Button
            label="Share"
            size="sm"
            icon={<Plus size={16} color={colors.primaryForeground} />}
            onPress={() => setComposeOpen(true)}
          />
        </View>
        <MediaDiscoverySearch />
      </View>

      <Segmented<FeedFilter>
        value={filter}
        onChange={setFilter}
        items={[
          {
            value: "global",
            label: "Global",
            icon: <Globe size={16} color={colors.mutedForeground} />,
          },
          {
            value: "friends",
            label: "Friends",
            icon: <Users size={16} color={colors.mutedForeground} />,
          },
        ]}
      />
    </View>
  );

  const listEmpty = isLoading ? (
    <View style={{ gap: 16 }}>
      {[0, 1, 2].map((i) => (
        <FeedPostSkeleton key={i} />
      ))}
    </View>
  ) : error ? (
    <EmptyState
      icon={<AlertCircle size={28} color={colors.destructive} />}
      title="Couldn't load the feed"
      description={error}
      action={<Button label="Try again" onPress={() => void load(1, "initial")} />}
    />
  ) : (
    <EmptyState
      icon={<Rss size={28} color={colors.mutedForeground} />}
      title={filter === "friends" ? "No friend posts yet" : "No posts yet"}
      description={
        filter === "friends"
          ? "Follow friends to see their shares here, or switch to Global."
          : "Be the first to share something you've learned!"
      }
      action={
        <Button
          label="Share something"
          icon={<Plus size={16} color={colors.primaryForeground} />}
          onPress={() => setComposeOpen(true)}
        />
      }
    />
  );

  const listFooter = isLoadingMore ? (
    <ActivityIndicator color={colors.primary} style={{ paddingVertical: 16 }} />
  ) : error && posts.length > 0 ? (
    <Button variant="outline" label="Retry" onPress={() => void load(1, "refresh")} />
  ) : undefined;

  return (
    <Screen
      scroll={false}
      padded={false}
      contentContainerStyle={{ paddingTop: 0, paddingBottom: 0, gap: 0 }}
    >
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedPostCard
            post={item}
            onUpdate={handlePostUpdate}
            onDelete={handlePostDelete}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      />

      <FeedComposeSheet
        visible={composeOpen}
        onClose={() => setComposeOpen(false)}
        onPost={handlePostCreated}
        showTrigger={false}
      />
    </Screen>
  );
}
