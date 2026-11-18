import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  PenLine,
  Plus,
  Search,
  X,
} from "lucide-react-native";

import { useTheme } from "@/theme";
import { mediaService } from "@/services/mediaService";
import { mediaSearchService } from "@/services/externalServices";
import type { MediaStatus, MediaType } from "@/types";
import {
  Button,
  Card,
  ChipSelect,
  Field,
  IconButton,
  Input,
  Label,
  Row,
  Screen,
  Segmented,
  Text,
  Textarea,
  useToast,
  type TabItem,
} from "@/components/ui";
import { MediaPoster } from "@/components/media/MediaCard";
import { MediaResultCard, ResultGroupHeader } from "@/components/library/MediaResultCard";
import { MediaPreviewSheet } from "@/components/library/MediaPreviewSheet";
import {
  getMediaLabel,
  getResultCover,
  mediaTypes,
  type MediaResultItem,
} from "@/components/library/mediaResult";
import { prefetchImages } from "@/lib/prefetch";

type Mode = "search" | "manual";
type ResultFilter = "all" | "moviesTv" | "books";

interface AddFormData {
  title: string;
  type: MediaType;
  year: string;
  creator: string;
  description: string;
  coverUrl: string;
  status: MediaStatus;
  tags: string[];
  externalSource: string;
  externalId: string;
}

const STATUS_TABS: TabItem<MediaStatus>[] = [
  { value: "planned", label: "Planned" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const EXAMPLE_SEARCHES = ["Interstellar", "Dune", "The Bear", "Atomic Habits"];

function getItemKey(item: MediaResultItem, idx: number): string {
  return `${item.type}-${item.external_id || item.title}-${idx}`;
}

function getCreatorLabel(type: MediaType): string {
  if (type === "book") return "Author";
  if (type === "movie" || type === "documentary") return "Director";
  if (type === "podcast") return "Host / Creator";
  if (type === "game") return "Studio / Developer";
  return "Creator";
}

export function AddMediaScreen() {
  const { colors, radius } = useTheme();
  const router = useRouter();
  const { toast } = useToast();
  const params = useLocalSearchParams<{ type?: string; q?: string }>();

  const initialType = (params.type as MediaType) || "movie";
  const initialQuery = (params.q ?? "").trim();

  const [mode, setMode] = useState<Mode>("search");
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showCoverField, setShowCoverField] = useState(false);
  const searchRequestId = useRef(0);

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedResult, setSelectedResult] = useState<MediaResultItem | null>(null);
  const [groupedResults, setGroupedResults] = useState<{
    moviesTv: MediaResultItem[];
    books: MediaResultItem[];
  }>(() => ({ moviesTv: [], books: [] }));
  const [previewItem, setPreviewItem] = useState<MediaResultItem | null>(null);
  const [formData, setFormData] = useState<AddFormData>(() => ({
    title: initialQuery,
    type: initialType,
    year: "",
    creator: "",
    description: "",
    coverUrl: "",
    status: "planned",
    tags: [],
    externalSource: "",
    externalId: "",
  }));
  const [tagInput, setTagInput] = useState("");

  const update = useCallback(
    <K extends keyof AddFormData>(key: K, value: AddFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleAddTag = useCallback(() => {
    const nextTag = tagInput.trim();
    if (!nextTag) return;
    setFormData((prev) =>
      prev.tags.includes(nextTag) ? prev : { ...prev, tags: [...prev.tags, nextTag] },
    );
    setTagInput("");
  }, [tagInput]);

  const handleRemoveTag = useCallback((tag: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) }));
  }, []);

  const applyResultToForm = useCallback((item: MediaResultItem) => {
    setSelectedResult(item);
    setFormData((prev) => ({
      ...prev,
      title: item.title || prev.title,
      type: item.type || prev.type,
      year: item.year ? String(item.year) : "",
      creator: item.creator || "",
      description: item.description || "",
      coverUrl: item.cover_url || "",
      externalSource: item.external_source || "",
      externalId: item.external_id || "",
    }));
    setMode("manual");
  }, []);

  const clearSelectedResult = useCallback(() => {
    setSelectedResult(null);
    setFormData((prev) => ({
      ...prev,
      title: "",
      year: "",
      creator: "",
      description: "",
      coverUrl: "",
      externalSource: "",
      externalId: "",
    }));
  }, []);

  const openManualWithQuery = useCallback(
    (title?: string) => {
      const prefill = (title ?? searchQuery).trim();
      if (prefill) {
        setFormData((prev) => (prev.title.trim() ? prev : { ...prev, title: prefill }));
      }
      setMode("manual");
    },
    [searchQuery],
  );

  const addResultDirectly = useCallback(
    async (item: MediaResultItem, key?: string) => {
      setIsLoading(true);
      setAddingKey(key ?? item.title);
      try {
        const media = await mediaService.create({
          title: item.title,
          type: item.type,
          year: item.year ?? undefined,
          creator: item.creator ?? undefined,
          description: item.description ?? undefined,
          coverUrl: item.cover_url ?? undefined,
          status: formData.status,
          tags: formData.tags,
          externalSource: item.external_source,
          externalId: item.external_id,
        });
        toast({
          title: "Added to your library",
          description: `${item.title} has been saved.`,
        });
        router.replace({ pathname: "/media/[id]", params: { id: media.id } });
      } catch (error) {
        toast({
          title: "Couldn't add title",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        setAddingKey(null);
      }
    },
    [formData.status, formData.tags, router, toast],
  );

  const handleSubmit = useCallback(async () => {
    const title = formData.title.trim();
    if (!title) {
      toast({
        title: "Title required",
        description: "Give your entry a title to save it.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      let autoResult: MediaResultItem | undefined;
      const needsDetails =
        !formData.externalId &&
        (!formData.coverUrl || !formData.year || !formData.creator || !formData.description);

      if (needsDetails) {
        try {
          const results = await mediaSearchService.searchMedia(title, formData.type);
          autoResult = results[0];
        } catch {
          // Proceed with manual details if lookup is unavailable
        }
      }

      const media = await mediaService.create({
        title: title || autoResult?.title || "",
        type: formData.type || autoResult?.type || "movie",
        year: formData.year ? parseInt(formData.year, 10) : autoResult?.year ?? undefined,
        creator: formData.creator.trim() || autoResult?.creator || undefined,
        description: formData.description.trim() || autoResult?.description || undefined,
        coverUrl: formData.coverUrl.trim() || autoResult?.cover_url || undefined,
        status: formData.status,
        tags: formData.tags,
        externalSource: formData.externalSource || autoResult?.external_source || undefined,
        externalId: formData.externalId || autoResult?.external_id || undefined,
      });

      toast({
        title: "Added to your library",
        description: `${title} has been saved.`,
      });
      router.replace({ pathname: "/media/[id]", params: { id: media.id } });
    } catch (error) {
      toast({
        title: "Couldn't save entry",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [formData, router, toast]);

  const runSearch = useCallback(
    async (rawQuery: string) => {
      const query = rawQuery.trim();
      const requestId = ++searchRequestId.current;
      if (!query) {
        setGroupedResults({ moviesTv: [], books: [] });
        setHasSearched(false);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await mediaSearchService.searchMediaGrouped(query);
        if (requestId !== searchRequestId.current) return;
        setGroupedResults(results);
        setHasSearched(true);
        setResultFilter("all");
        prefetchImages([
          ...(results.moviesTv || []).map((m) => m.cover_url),
          ...(results.books || []).map((b) => b.cover_url),
        ]);
      } catch {
        if (requestId !== searchRequestId.current) return;
        setGroupedResults({ moviesTv: [], books: [] });
        toast({
          title: "Search unavailable",
          description: "Couldn't load results right now. You can still add it manually.",
          variant: "destructive",
        });
      } finally {
        if (requestId === searchRequestId.current) setIsSearching(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      searchRequestId.current += 1;
      setGroupedResults({ moviesTv: [], books: [] });
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      void runSearch(query);
    }, 320);

    return () => clearTimeout(timer);
  }, [searchQuery, runSearch]);

  const totalMoviesTv = groupedResults.moviesTv.length;
  const totalBooks = groupedResults.books.length;
  const totalResults = totalMoviesTv + totalBooks;

  const visibleMoviesTv = useMemo(
    () => (resultFilter === "books" ? [] : groupedResults.moviesTv.slice(0, 8)),
    [groupedResults.moviesTv, resultFilter],
  );
  const visibleBooks = useMemo(
    () => (resultFilter === "moviesTv" ? [] : groupedResults.books.slice(0, 8)),
    [groupedResults.books, resultFilter],
  );

  const modeItems: TabItem<Mode>[] = [
    {
      value: "search",
      label: "Search",
      icon: (
        <Search
          size={15}
          color={mode === "search" ? colors.foreground : colors.mutedForeground}
        />
      ),
    },
    {
      value: "manual",
      label: "Add manually",
      icon: (
        <PenLine
          size={15}
          color={mode === "manual" ? colors.foreground : colors.mutedForeground}
        />
      ),
    },
  ];

  return (
    <Screen safeTop>
      {/* Clean Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <IconButton
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/library"))}
        >
          <ArrowLeft size={22} color={colors.foreground} />
        </IconButton>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="h2" weight="bold">
            Add to Library
          </Text>
          <Text variant="small" color="mutedForeground">
            Search a movie, show, or book — or add your own.
          </Text>
        </View>
      </View>

      {/* Simple Mode Switcher */}
      <Segmented<Mode> value={mode} onChange={setMode} items={modeItems} />

      {mode === "search" ? (
        <View style={{ gap: 16 }}>
          {/* Search Input */}
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search movies, TV shows, or books..."
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => void runSearch(searchQuery)}
            icon={<Search size={18} color={colors.mutedForeground} />}
            trailing={
              <Row gap={6}>
                {isSearching ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : null}
                {searchQuery ? (
                  <Pressable
                    onPress={() => setSearchQuery("")}
                    hitSlop={10}
                    accessibilityLabel="Clear search"
                  >
                    <X size={18} color={colors.mutedForeground} />
                  </Pressable>
                ) : null}
              </Row>
            }
          />

          {/* Quick Save Status */}
          <View style={{ gap: 6 }}>
            <Text variant="caption" color="mutedForeground">
              Save as
            </Text>
            <Segmented<MediaStatus>
              value={formData.status}
              onChange={(value) => update("status", value)}
              items={STATUS_TABS}
            />
          </View>

          {/* Category Filter (only when both Movies/TV and Books exist) */}
          {totalMoviesTv > 0 && totalBooks > 0 ? (
            <Segmented<ResultFilter>
              value={resultFilter}
              onChange={setResultFilter}
              items={[
                { value: "all", label: `All (${totalResults})` },
                { value: "moviesTv", label: `Movies & TV (${totalMoviesTv})` },
                { value: "books", label: `Books (${totalBooks})` },
              ]}
            />
          ) : null}

          {/* Empty / Loading / Results */}
          {!searchQuery.trim() ? (
            <Card variant="outline" style={{ padding: 20, gap: 14, alignItems: "center" }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.lg,
                  backgroundColor: colors.primary + "1a",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Search size={20} color={colors.primary} />
              </View>
              <View style={{ gap: 4, alignItems: "center" }}>
                <Text variant="h4" weight="semibold" align="center">
                  Find something to watch or read
                </Text>
                <Text variant="small" color="mutedForeground" align="center">
                  Start typing above to add a title in one tap with its poster and details.
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {EXAMPLE_SEARCHES.map((example) => (
                  <Pressable
                    key={example}
                    onPress={() => setSearchQuery(example)}
                    style={({ pressed }) => ({
                      borderRadius: radius.full,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: pressed ? colors.accent : colors.card,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    })}
                  >
                    <Text variant="caption" color="foreground" weight="medium">
                      {example}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable onPress={() => setMode("manual")} hitSlop={8}>
                <Text variant="small" tint={colors.primary} weight="medium">
                  Adding a podcast, game, or custom entry? Add manually →
                </Text>
              </Pressable>
            </Card>
          ) : isSearching && totalResults === 0 ? (
            <Card variant="outline" style={{ padding: 28, alignItems: "center", gap: 10 }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text variant="small" color="mutedForeground">
                Searching for "{searchQuery.trim()}"…
              </Text>
            </Card>
          ) : totalResults === 0 && hasSearched ? (
            <Card variant="outline" style={{ padding: 24, alignItems: "center", gap: 12 }}>
              <Text variant="h4" weight="semibold" align="center">
                No matches for "{searchQuery.trim()}"
              </Text>
              <Text variant="small" color="mutedForeground" align="center">
                Try another spelling, or add it yourself in seconds.
              </Text>
              <Button
                label={`Add "${searchQuery.trim()}" manually`}
                icon={<Plus size={16} color={colors.primaryForeground} />}
                onPress={() => openManualWithQuery(searchQuery)}
              />
            </Card>
          ) : (
            <View style={{ gap: 16 }}>
              {visibleMoviesTv.length > 0 ? (
                <View style={{ gap: 10 }}>
                  {visibleBooks.length > 0 ? (
                    <ResultGroupHeader title="Movies & TV" count={visibleMoviesTv.length} />
                  ) : null}
                  {visibleMoviesTv.map((item, idx) => {
                    const key = getItemKey(item, idx);
                    return (
                      <MediaResultCard
                        key={key}
                        item={item}
                        isAdding={addingKey === key}
                        onPreview={setPreviewItem}
                        onAutofill={applyResultToForm}
                        onAdd={(it) => void addResultDirectly(it, key)}
                      />
                    );
                  })}
                </View>
              ) : null}

              {visibleBooks.length > 0 ? (
                <View style={{ gap: 10 }}>
                  {visibleMoviesTv.length > 0 ? (
                    <ResultGroupHeader title="Books" count={visibleBooks.length} />
                  ) : null}
                  {visibleBooks.map((item, idx) => {
                    const key = getItemKey(item, idx);
                    return (
                      <MediaResultCard
                        key={key}
                        item={item}
                        isBook
                        isAdding={addingKey === key}
                        onPreview={setPreviewItem}
                        onAutofill={applyResultToForm}
                        onAdd={(it) => void addResultDirectly(it, key)}
                      />
                    );
                  })}
                </View>
              ) : null}

              <Pressable
                onPress={() => openManualWithQuery(searchQuery)}
                style={{ alignItems: "center", paddingVertical: 8 }}
              >
                <Text variant="small" color="mutedForeground">
                  Didn't find it?{" "}
                  <Text variant="small" tint={colors.primary} weight="medium">
                    Add "{searchQuery.trim()}" manually →
                  </Text>
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : (
        /* Clean Manual Entry Form */
        <View style={{ gap: 16 }}>
          {selectedResult ? (
            <Card
              variant="outline"
              style={{
                padding: 12,
                borderColor: colors.primary + "55",
                backgroundColor: colors.primary + "0d",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 44 }}>
                  <MediaPoster
                    coverUrl={getResultCover(selectedResult)}
                    type={selectedResult.type}
                    title={selectedResult.title}
                    height={64}
                    style={{ width: 44 }}
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="caption" tint={colors.primary} weight="medium">
                    Selected from search
                  </Text>
                  <Text variant="label" weight="semibold" numberOfLines={1}>
                    {selectedResult.title}
                  </Text>
                  <Text variant="caption" color="mutedForeground" numberOfLines={1}>
                    {getMediaLabel(selectedResult.type)}
                    {selectedResult.year ? ` · ${selectedResult.year}` : ""}
                    {selectedResult.creator ? ` · ${selectedResult.creator}` : ""}
                  </Text>
                </View>
                <Button size="sm" variant="ghost" label="Clear" onPress={clearSelectedResult} />
              </View>
            </Card>
          ) : null}

          <Card variant="glass" style={{ gap: 16 }}>
            <Field label="Title *">
              <Input
                value={formData.title}
                onChangeText={(value) => update("title", value)}
                placeholder="e.g., Interstellar, Atomic Habits..."
              />
            </Field>

            <View style={{ gap: 8 }}>
              <Label>Type</Label>
              <ChipSelect<MediaType>
                value={formData.type}
                onChange={(value) => {
                  if (value !== "all") update("type", value);
                }}
                options={mediaTypes}
              />
            </View>

            <View style={{ gap: 8 }}>
              <Label>Status</Label>
              <Segmented<MediaStatus>
                value={formData.status}
                onChange={(value) => update("status", value)}
                items={STATUS_TABS}
              />
            </View>

            <Row gap={12} align="flex-start">
              <View style={{ flex: 1 }}>
                <Field label={getCreatorLabel(formData.type)}>
                  <Input
                    value={formData.creator}
                    onChangeText={(value) => update("creator", value)}
                    placeholder="Optional"
                  />
                </Field>
              </View>
              <View style={{ width: 108 }}>
                <Field label="Year">
                  <Input
                    value={formData.year}
                    onChangeText={(value) => update("year", value)}
                    keyboardType="number-pad"
                    placeholder="2024"
                  />
                </Field>
              </View>
            </Row>

            <Field label="Summary or notes">
              <Textarea
                value={formData.description}
                onChangeText={(value) => update("description", value)}
                placeholder="Write a short description or why you want to check this out..."
              />
            </Field>

            <View style={{ gap: 8 }}>
              <Label>Tags</Label>
              <Row gap={10} align="flex-start">
                <Input
                  containerStyle={{ flex: 1 }}
                  value={tagInput}
                  onChangeText={setTagInput}
                  placeholder="Add a tag..."
                  returnKeyType="done"
                  onSubmitEditing={handleAddTag}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onPress={handleAddTag}
                  accessibilityLabel="Add tag"
                >
                  <Plus size={18} color={colors.foreground} />
                </Button>
              </Row>
              {formData.tags.length > 0 ? (
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                  {formData.tags.map((tag) => (
                    <View
                      key={tag}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: colors.border,
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                      }}
                    >
                      <Text variant="small">{tag}</Text>
                      <Button
                        size="iconSm"
                        variant="ghost"
                        onPress={() => handleRemoveTag(tag)}
                        accessibilityLabel={`Remove ${tag}`}
                      >
                        <X size={13} color={colors.mutedForeground} />
                      </Button>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {/* Collapsible optional custom cover link */}
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border + "66", paddingTop: 12, gap: 10 }}>
              <Pressable
                onPress={() => setShowCoverField((v) => !v)}
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                {showCoverField || formData.coverUrl.trim() ? (
                  <ChevronUp size={15} color={colors.mutedForeground} />
                ) : (
                  <ChevronDown size={15} color={colors.mutedForeground} />
                )}
                <Text variant="caption" color="mutedForeground" weight="medium">
                  {formData.coverUrl.trim()
                    ? "Cover image attached"
                    : "Add a custom cover image (optional)"}
                </Text>
              </Pressable>

              {showCoverField || formData.coverUrl.trim() ? (
                <View style={{ gap: 10 }}>
                  <Input
                    value={formData.coverUrl}
                    onChangeText={(value) => update("coverUrl", value)}
                    placeholder="Paste an image link (https://...)"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                  {formData.coverUrl.trim() ? (
                    <View style={{ width: 76 }}>
                      <MediaPoster
                        coverUrl={formData.coverUrl.trim()}
                        type={formData.type}
                        height={114}
                        style={{ width: 76 }}
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          </Card>

          <Row gap={12}>
            <Button
              variant="outline"
              size="lg"
              label="Cancel"
              style={{ flex: 1 }}
              onPress={() => router.back()}
            />
            <Button
              size="lg"
              label="Save to Library"
              style={{ flex: 1 }}
              loading={isLoading}
              disabled={isLoading || !formData.title.trim()}
              onPress={() => void handleSubmit()}
            />
          </Row>
        </View>
      )}

      <MediaPreviewSheet
        item={previewItem}
        isAdding={isLoading}
        onClose={() => setPreviewItem(null)}
        onAutofill={(item) => {
          applyResultToForm(item);
          setPreviewItem(null);
        }}
        onAdd={async (item) => {
          await addResultDirectly(item);
          setPreviewItem(null);
        }}
      />
    </Screen>
  );
}
