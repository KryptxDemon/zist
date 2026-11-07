import React, { useCallback, useEffect, useState } from "react";
import { ImageBackground, RefreshControl, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Info,
  Lightbulb,
  MoreVertical,
  Pencil,
  Quote,
  Trash2,
} from "lucide-react-native";

import { useTheme } from "@/theme";
import {
  ActionSheet,
  Button,
  ConfirmDialog,
  EmptyState,
  IconButton,
  MediaTypeBadge,
  Row,
  Screen,
  Segmented,
  Skeleton,
  StarRating,
  StatusBadge,
  TabBar,
  Text,
  ThemeCardSkeleton,
  useToast,
  type TabItem,
} from "@/components/ui";
import { MediaPoster } from "@/components/media/MediaCard";
import {
  factService,
  mediaService,
  quoteService,
  themeService,
  vocabService,
} from "@/services/mediaService";
import type {
  FactItem,
  MediaItem,
  MediaStats,
  MediaStatus,
  QuoteItem,
  ThemeConcept,
  VocabItem,
} from "@/types";
import {
  EditMediaSheet,
  FactsTab,
  OverviewTab,
  QuotesTab,
  ThemesTab,
  VocabTab,
  TagRow,
  DetailSection,
  type DetailTab,
  type MediaEditValues,
} from "@/components/media/detail";

const AUTO_GENERATE_TYPES = ["movie", "documentary", "tv"];

/**
 * React Native port of the web `MediaDetail` page: cover header, tabbed
 * themes / vocabulary / quotes / facts CRUD and AI helpers.
 */
export function MediaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { toast } = useToast();
  const insets = useSafeAreaInsets();

  const [media, setMedia] = useState<MediaItem | null>(null);
  const [stats, setStats] = useState<MediaStats | null>(null);
  const [themes, setThemes] = useState<ThemeConcept[]>([]);
  const [facts, setFacts] = useState<FactItem[]>([]);
  const [vocab, setVocab] = useState<VocabItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");

  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);

  const [nonces, setNonces] = useState<Record<DetailTab, number>>({
    overview: 0,
    themes: 0,
    vocab: 0,
    quotes: 0,
    facts: 0,
  });

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [mediaData, statsData, themesData, factsData, vocabData, quotesData] =
        await Promise.all([
          mediaService.getById(id),
          mediaService.getStats(id),
          themeService.getByMediaId(id),
          factService.getByMediaId(id),
          vocabService.getByMediaId(id),
          quoteService.getByMediaId(id),
        ]);

      if (!mediaData) {
        router.replace("/library");
        return;
      }

      setMedia(mediaData);
      setStats(statsData);
      setThemes(themesData);
      setFacts(factsData);
      setVocab(vocabData);
      setQuotes(quotesData);

      // Auto-generate themes for empty media types that support it.
      if (themesData.length === 0 && AUTO_GENERATE_TYPES.includes(mediaData.type)) {
        try {
          const result = await themeService.generateForMedia(mediaData.id, 5);
          const allThemes = [...result.created, ...result.updated];
          if (allThemes.length > 0) setThemes(allThemes);
        } catch (error) {
          console.error("Failed to auto-generate themes:", error);
        }
      }
    } catch (error) {
      console.error("Failed to load media:", error);
      toast({ title: "Failed to load media", variant: "destructive" });
    }
  }, [id, router, toast]);

  useEffect(() => {
    setIsLoading(true);
    void loadData().finally(() => setIsLoading(false));
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/library");
  };

  const handleQuickAdd = (tab: DetailTab) => {
    setActiveTab(tab);
    setNonces((prev) => ({ ...prev, [tab]: prev[tab] + 1 }));
  };

  const handleStatusChange = async (status: MediaStatus) => {
    if (!media) return;
    const previous = media;
    setMedia({ ...media, status });
    try {
      const updated = await mediaService.update(media.id, { status });
      setMedia((current) => (current ? { ...current, ...updated, status } : updated));
      toast({ title: `Status set to ${status}` });
    } catch {
      setMedia(previous);
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const handleRate = async (rating: number) => {
    if (!media) return;
    const previous = media;
    setMedia({ ...media, rating });
    try {
      const updated = await mediaService.update(media.id, { rating });
      setMedia(updated);
    } catch {
      setMedia(previous);
      toast({ title: "Failed to update rating", variant: "destructive" });
    }
  };

  const handleEditSubmit = async (values: MediaEditValues) => {
    if (!media) return;
    try {
      const updated = await mediaService.update(media.id, values);
      setMedia(updated);
      setEditVisible(false);
      toast({ title: "Media updated" });
    } catch (error) {
      toast({
        title: "Failed to update media",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMedia = async () => {
    if (!media) return;
    try {
      await mediaService.delete(media.id);
      toast({ title: "Media deleted" });
      router.replace("/library");
    } catch (error) {
      toast({
        title: "Failed to delete media",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Screen contentContainerStyle={{ paddingTop: insets.top + 12 }}>
        <Row gap={16}>
          <Skeleton width={40} height={40} rounded={10} />
          <View style={{ gap: 8 }}>
            <Skeleton width={180} height={24} />
            <Skeleton width={120} height={16} />
          </View>
        </Row>
        <Skeleton height={192} rounded={20} />
        <ThemeCardSkeleton />
        <ThemeCardSkeleton />
      </Screen>
    );
  }

  if (!media) {
    return (
      <Screen contentContainerStyle={{ paddingTop: insets.top + 12 }}>
        <EmptyState
          icon={<Info size={28} color={colors.mutedForeground} />}
          title="Media not found"
          description="This item may have been deleted or you don't have access to it."
          action={<Button label="Back to library" onPress={() => router.replace("/library")} />}
        />
      </Screen>
    );
  }

  const subtitle = [media.creator, media.year ? String(media.year) : null]
    .filter(Boolean)
    .join(" • ");
  const createdDate = new Date(media.createdAt).toLocaleDateString();
  const updatedDate = new Date(media.updatedAt).toLocaleDateString();

  const tabs: TabItem<DetailTab>[] = [
    {
      value: "overview",
      label: "Overview",
      icon: <Info size={16} color={colors.mutedForeground} />,
    },
    {
      value: "themes",
      label: "Themes",
      badge: themes.length,
      icon: <Lightbulb size={16} color={colors.mutedForeground} />,
    },
    {
      value: "vocab",
      label: "Vocabulary",
      badge: vocab.length,
      icon: <BookOpen size={16} color={colors.mutedForeground} />,
    },
    {
      value: "quotes",
      label: "Quotes",
      badge: quotes.length,
      icon: <Quote size={16} color={colors.mutedForeground} />,
    },
    {
      value: "facts",
      label: "Facts",
      badge: facts.length,
      icon: <Info size={16} color={colors.mutedForeground} />,
    },
  ];

  const statusItems: TabItem<MediaStatus>[] = [
    { value: "planned", label: "Planned" },
    { value: "in-progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <Screen
      contentContainerStyle={{ paddingTop: insets.top + 12 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void handleRefresh()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Nav bar */}
      <Row justify="space-between">
        <IconButton accessibilityLabel="Back" onPress={goBack}>
          <ArrowLeft size={20} color={colors.foreground} />
        </IconButton>
        <Row gap={4}>
          <IconButton
            accessibilityLabel="Take quiz"
            onPress={() => router.push(`/quiz/${media.id}`)}
          >
            <Brain size={20} color={colors.foreground} />
          </IconButton>
          <IconButton accessibilityLabel="More actions" onPress={() => setMenuVisible(true)}>
            <MoreVertical size={20} color={colors.foreground} />
          </IconButton>
        </Row>
      </Row>

      {/* Title block */}
      <View style={[styles.heroFrame, { borderColor: colors.border }]}>
        {media.coverUrl ? (
          <ImageBackground
            source={{ uri: media.coverUrl }}
            blurRadius={18}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
            imageStyle={styles.heroImage}
            accessibilityLabel={`${media.title} cover`}
          />
        ) : null}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.background + (media.coverUrl ? "d9" : "00") },
          ]}
        />
        <View style={styles.heroContent}>
          <Text variant="h1" numberOfLines={3}>
            {media.title}
          </Text>
          <Row gap={8} wrap>
            <MediaTypeBadge type={media.type} size="md" />
            <StatusBadge status={media.status} />
          </Row>
          {subtitle ? <Text variant="muted">{subtitle}</Text> : null}
          <StarRating value={media.rating ?? 0} size={22} onChange={handleRate} />
          <Segmented value={media.status} onChange={handleStatusChange} items={statusItems} />
        </View>
      </View>

      {/* Cover + tags */}
      <DetailSection>
        <Row gap={16} align="flex-start">
          <MediaPoster
            coverUrl={media.coverUrl}
            type={media.type}
            title={media.title}
            height={180}
            style={{ width: 120, flexGrow: 0 }}
          />
          <View style={{ flex: 1, gap: 10 }}>
            <Text variant="label" color="mutedForeground">Description</Text>
            <Text
              variant="small"
              numberOfLines={6}
              color={media.description ? "foreground" : "mutedForeground"}
              style={!media.description ? { fontStyle: "italic" } : undefined}
            >
              {media.description || "No description available."}
            </Text>
          </View>
        </Row>
        <View style={{ gap: 10 }}>
          <Text variant="label" color="mutedForeground">Tags</Text>
            {media.tags.length > 0 ? (
              <TagRow tags={media.tags} />
            ) : (
              <Text variant="small" color="mutedForeground" style={{ fontStyle: "italic" }}>
                No tags
              </Text>
            )}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <View style={{ flex: 1, minWidth: 130, gap: 3 }}>
            <Text variant="caption" color="mutedForeground">Added</Text>
            <Text variant="small">{createdDate}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 130, gap: 3 }}>
            <Text variant="caption" color="mutedForeground">Last updated</Text>
            <Text variant="small">{updatedDate}</Text>
          </View>
          {media.externalSource || media.externalId ? (
            <View style={{ flex: 1, minWidth: 130, gap: 3 }}>
              <Text variant="caption" color="mutedForeground">External reference</Text>
              <Text variant="small" numberOfLines={1}>
                {[media.externalSource, media.externalId].filter(Boolean).join(" · ")}
              </Text>
            </View>
          ) : null}
        </View>
      </DetailSection>

      {/* Tabs */}
      <TabBar value={activeTab} onChange={setActiveTab} items={tabs} />

      {activeTab === "overview" ? (
        <OverviewTab
          media={media}
          stats={stats}
          themes={themes}
          facts={facts.length}
          vocab={vocab}
          quotes={quotes}
          onQuickAdd={handleQuickAdd}
        />
      ) : null}

      {activeTab === "themes" ? (
        <ThemesTab
          mediaId={media.id}
          mediaTitle={media.title}
          themes={themes}
          setThemes={setThemes}
          openAddNonce={nonces.themes}
        />
      ) : null}

      {activeTab === "vocab" ? (
        <VocabTab
          mediaId={media.id}
          mediaTitle={media.title}
          mediaOverview={media.description}
          vocab={vocab}
          setVocab={setVocab}
          openAddNonce={nonces.vocab}
        />
      ) : null}

      {activeTab === "quotes" ? (
        <QuotesTab
          mediaId={media.id}
          quotes={quotes}
          setQuotes={setQuotes}
          themes={themes}
          openAddNonce={nonces.quotes}
        />
      ) : null}

      {activeTab === "facts" ? (
        <FactsTab
          mediaId={media.id}
          facts={facts}
          setFacts={setFacts}
          openAddNonce={nonces.facts}
        />
      ) : null}

      <ActionSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title={media.title}
        actions={[
          {
            label: "Edit media",
            icon: <Pencil size={18} color={colors.foreground} />,
            onPress: () => setEditVisible(true),
          },
          {
            label: "Start quiz",
            icon: <Brain size={18} color={colors.foreground} />,
            onPress: () => router.push(`/quiz/${media.id}`),
          },
          {
            label: "Delete media",
            icon: <Trash2 size={18} color={colors.destructive} />,
            destructive: true,
            onPress: () => setDeleteVisible(true),
          },
        ]}
      />

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete media"
        description={`Delete "${media.title}"? This will remove its themes, vocab, facts, and quotes.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          setDeleteVisible(false);
          void handleDeleteMedia();
        }}
        onCancel={() => setDeleteVisible(false)}
      />

      {editVisible ? (
        <EditMediaSheet
          visible={editVisible}
          media={media}
          onClose={() => setEditVisible(false)}
          onSubmit={handleEditSubmit}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroFrame: {
    minHeight: 220,
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
  },
  heroImage: {
    opacity: 0.9,
  },
  heroContent: {
    gap: 10,
    padding: 18,
  },
});
