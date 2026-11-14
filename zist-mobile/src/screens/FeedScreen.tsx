import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AlertCircle,
  BookOpen,
  Film,
  Globe,
  Library,
  Lightbulb,
  Plus,
  Quote,
  Rss,
  Users,
} from "lucide-react-native";

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

const PAGE_SIZE = 15;

type FeedFilter = "global" | "friends";
type ContentTypeFilter = "all" | "media" | "quote" | "theme" | "vocab";

export function FeedScreen() {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState<FeedFilter>("global");
  const [contentType, setContentType] = useState<ContentTypeFilter>("all");
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
        if (id !== requestIdRef.current) return;

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
        setError(err instanceof Error ? err.message : "Failed to load dispatches");
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

  const filteredPosts = useMemo(() => {
    if (contentType === "all") return posts;
    return posts.filter((p) => p.type === contentType);
  }, [posts, contentType]);

  // Works currently in discourse
  const mediaHighlights = useMemo(() => {
    const list: { id: string; title: string; cover: string }[] = [];
    const seen = new Set<string>();
    for (const p of posts) {
      const cover = p.imageUrl || p.mediaCoverUrl;
      const title = p.mediaTitle || (p.content?.title ?? "Untitled");
      if (cover && !seen.has(cover)) {
        seen.add(cover);
        list.push({ id: p.id, title, cover });
        if (list.length >= 8) break;
      }
    }
    return list;
  }, [posts]);

  const header = (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 10 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="h2">Dispatches</Text>
            <Text variant="muted" numberOfLines={2}>
              A quiet forum for marginalia, cinematic reflections, and critical thought
            </Text>
          </View>
          <Button
            label="Inscribe"
            size="sm"
            icon={<Plus size={15} color={colors.primaryForeground} />}
            onPress={() => setComposeOpen(true)}
          />
        </View>
        <MediaDiscoverySearch placeholder="Search titles, authors, and directors…" />
      </View>

      {/* Works in discourse reel */}
      {mediaHighlights.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Text variant="caption" weight="semibold" color="mutedForeground" style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
            Works in Discourse
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingVertical: 2 }}
          >
            {mediaHighlights.map((item) => (
              <View key={item.id} style={{ width: 68, alignItems: "center", gap: 4 }}>
                <Image
                  source={{ uri: item.cover }}
                  style={{
                    width: 68,
                    height: 100,
                    borderRadius: radius.md,
                    backgroundColor: colors.border,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: colors.border,
                  }}
                  resizeMode="cover"
                />
                <Text variant="caption" numberOfLines={1} style={{ textAlign: "center", fontSize: 10 }}>
                  {item.title}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Audience selector */}
      <Segmented<FeedFilter>
        value={filter}
        onChange={setFilter}
        items={[
          {
            value: "global",
            label: "Public Forum",
            icon: <Globe size={14} color={colors.mutedForeground} />,
          },
          {
            value: "friends",
            label: "Fellow Readers",
            icon: <Users size={14} color={colors.mutedForeground} />,
          },
        ]}
      />

      {/* Content category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
      >
        <Pressable
          onPress={() => setContentType("all")}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: radius.md,
            backgroundColor: contentType === "all" ? colors.foreground : colors.accent,
          }}
        >
          <Text
            variant="caption"
            weight="semibold"
            tint={contentType === "all" ? colors.background : colors.mutedForeground}
          >
            All Reflections
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setContentType("media")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: radius.md,
            backgroundColor: contentType === "media" ? "#d97706" : "rgba(245, 158, 11, 0.12)",
          }}
        >
          <Film size={12} color={contentType === "media" ? "#fff" : "#f59e0b"} />
          <Text
            variant="caption"
            weight="semibold"
            tint={contentType === "media" ? "#fff" : "#f59e0b"}
          >
            Cinema & Books
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setContentType("quote")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: radius.md,
            backgroundColor: contentType === "quote" ? "#7c3aed" : "rgba(139, 92, 246, 0.12)",
          }}
        >
          <Quote size={12} color={contentType === "quote" ? "#fff" : "#a78bfa"} />
          <Text
            variant="caption"
            weight="semibold"
            tint={contentType === "quote" ? "#fff" : "#a78bfa"}
          >
            Passages
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setContentType("theme")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: radius.md,
            backgroundColor: contentType === "theme" ? "#ca8a04" : "rgba(234, 179, 8, 0.12)",
          }}
        >
          <Lightbulb size={12} color={contentType === "theme" ? "#fff" : "#fbbf24"} />
          <Text
            variant="caption"
            weight="semibold"
            tint={contentType === "theme" ? "#fff" : "#fbbf24"}
          >
            Themes
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setContentType("vocab")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: radius.md,
            backgroundColor: contentType === "vocab" ? "#059669" : "rgba(16, 185, 129, 0.12)",
          }}
        >
          <BookOpen size={12} color={contentType === "vocab" ? "#fff" : "#34d399"} />
          <Text
            variant="caption"
            weight="semibold"
            tint={contentType === "vocab" ? "#fff" : "#34d399"}
          >
            Lexicon
          </Text>
        </Pressable>
      </ScrollView>
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
      icon={<AlertCircle size={26} color={colors.destructive} />}
      title="Could not retrieve dispatches"
      description={error}
      action={<Button label="Retry" onPress={() => void load(1, "initial")} />}
    />
  ) : (
    <EmptyState
      icon={<Rss size={26} color={colors.mutedForeground} />}
      title={filter === "friends" ? "Your literary circle is quiet" : "The forum awaits its first entry"}
      description={
        filter === "friends"
          ? "Follow fellow readers and cinephiles to see their marginalia here, or switch to the Public Forum."
          : "Inscribe your considered thoughts on a recent volume or film to inaugurate the discussion."
      }
      action={
        <Button
          label="Inscribe a reflection"
          icon={<Plus size={15} color={colors.primaryForeground} />}
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
        data={filteredPosts}
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
