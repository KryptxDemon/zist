import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, LibraryBig, Plus, Search, Star, WandSparkles, X } from "lucide-react-native";

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
  Select,
  StatusBadge,
  Text,
  Textarea,
  useToast,
  type SelectOption,
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

type Mode = "discover" | "manual";

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

const statusOptions: SelectOption<MediaStatus>[] = [
  { value: "planned", label: "Planned" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const STEP_CARDS = [
  { overline: "Step 1", label: "Search title" },
  { overline: "Step 2", label: "Choose details" },
  { overline: "Step 3", label: "Save instantly" },
];

/** Native port of the web `AddMedia` page. */
export function AddMediaScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { toast } = useToast();
  const params = useLocalSearchParams<{ type?: string; q?: string }>();

  const initialType = (params.type as MediaType) || "movie";
  const initialQuery = (params.q ?? "").trim();

  const [mode, setMode] = useState<Mode>("discover");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
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

  const applyResultToForm = useCallback(
    (item: MediaResultItem) => {
      setSelectedResult(item);
      setFormData((prev) => ({
        ...prev,
        title: item.title || prev.title,
        type: item.type || prev.type,
        year: item.year ? String(item.year) : prev.year,
        creator: item.creator || prev.creator,
        description: item.description || prev.description,
        coverUrl: item.cover_url || prev.coverUrl,
        externalSource: item.external_source || prev.externalSource,
        externalId: item.external_id || prev.externalId,
      }));
      setMode("manual");
      toast({
        title: "Details fetched",
        description: "Form updated with API data. You can edit and save.",
      });
    },
    [toast],
  );

  const addResultDirectly = useCallback(
    async (item: MediaResultItem) => {
      setIsLoading(true);
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
          title: "Media added!",
          description: `${item.title} was fetched and added automatically.`,
        });
        router.replace({ pathname: "/media/[id]", params: { id: media.id } });
      } catch (error) {
        toast({
          title: "Failed to add media",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [formData.status, formData.tags, router, toast],
  );

  const handleSubmit = useCallback(async () => {
    const title = formData.title.trim();
    if (!title) {
      toast({
        title: "Title required",
        description: "Please enter a title for your media.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      let autoResult: MediaResultItem | undefined;
      const needsAutoFetch =
        !formData.externalId &&
        (!formData.coverUrl || !formData.year || !formData.creator || !formData.description);

      if (needsAutoFetch) {
        const results = await mediaSearchService.searchMedia(title, formData.type);
        autoResult = results[0];
      }

      const media = await mediaService.create({
        title: title || autoResult?.title || "",
        type: autoResult?.type || formData.type,
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
        title: "Media added!",
        description: autoResult
          ? `${title} was auto-enriched from external APIs and added.`
          : `${title} has been added to your library.`,
      });
      router.replace({ pathname: "/media/[id]", params: { id: media.id } });
    } catch (error) {
      toast({
        title: "Failed to add media",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [formData, router, toast]);

  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query) {
      setGroupedResults({ moviesTv: [], books: [] });
      toast({
        title: "Search query required",
        description: "Type a title to fetch media details from APIs.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const results = await mediaSearchService.searchMediaGrouped(query);
      setGroupedResults(results);
      if (!results.moviesTv.length && !results.books.length) {
        toast({ title: "No results found", description: "Try a different title." });
      }
    } catch (error) {
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "Could not fetch data from API.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, toast]);

  // Live "search as you type" (debounced), mirroring the web effect.
  useEffect(() => {
    const query = searchQuery.trim();
    const requestId = ++searchRequestId.current;
    if (!query) {
      setGroupedResults({ moviesTv: [], books: [] });
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearching(true);
      void (async () => {
        try {
          const results = await mediaSearchService.searchMediaGrouped(query);
          if (requestId !== searchRequestId.current) return;
          setGroupedResults(results);
        } catch (error) {
          if (requestId !== searchRequestId.current) return;
          setGroupedResults({ moviesTv: [], books: [] });
          toast({
            title: "Search failed",
            description:
              error instanceof Error
                ? error.message
                : "Could not fetch media results.",
            variant: "destructive",
          });
        } finally {
          if (requestId === searchRequestId.current) setIsSearching(false);
        }
      })();
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, toast]);

  const selectedPreview = useMemo(
    () => selectedResult || groupedResults.moviesTv[0] || groupedResults.books[0] || null,
    [groupedResults.books, groupedResults.moviesTv, selectedResult],
  );

  const previewCoverUrl = selectedPreview
    ? getResultCover(selectedPreview)
    : formData.coverUrl.trim() || getResultCover({ type: formData.type, cover_url: undefined });

  const totalResults = groupedResults.moviesTv.length + groupedResults.books.length;
  const previewTitle = formData.title.trim() || selectedPreview?.title || "Untitled";

  const modeItems: TabItem<Mode>[] = [
    { value: "discover", label: "Search API", icon: <Search size={15} color={colors.mutedForeground} /> },
    { value: "manual", label: "Manual entry", icon: <LibraryBig size={15} color={colors.mutedForeground} /> },
  ];

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 4 }}>
        <IconButton
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/library"))}
        >
          <ArrowLeft size={22} color={colors.foreground} />
        </IconButton>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="h2" weight="bold">Add Media</Text>
          <Text variant="muted">
            Search by title or enter details to grow your library.
          </Text>
        </View>
      </View>

      <Row gap={8} align="stretch">
        {STEP_CARDS.map((step) => (
          <Card key={step.overline} variant="outline" style={{ flex: 1, padding: 12, gap: 4 }}>
            <Text variant="caption" uppercase letterSpacing={1}>
              {step.overline}
            </Text>
            <Text variant="small" weight="medium">
              {step.label}
            </Text>
          </Card>
        ))}
      </Row>

      {/* Live preview */}
      <Card variant="glass" style={{ gap: 12 }}>
        <Row gap={8}>
          <Star size={16} color={colors.primary} />
          <Text variant="h4" weight="semibold">
            Live preview
          </Text>
        </Row>
        <View style={{ flexDirection: "row", gap: 14 }}>
          <View style={{ width: 110 }}>
            <MediaPoster
              coverUrl={previewCoverUrl}
              type={formData.type}
              title={previewTitle}
              height={165}
              style={{ width: 110 }}
            />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text variant="h4" weight="bold" numberOfLines={2}>
              {previewTitle}
            </Text>
            <Text variant="caption">
              {getMediaLabel(formData.type)}
              {formData.year ? ` • ${formData.year}` : ""}
              {formData.creator ? ` • ${formData.creator}` : ""}
            </Text>
            <Row gap={8} wrap>
              <StatusBadge status={formData.status} />
              <Text variant="caption">{formData.tags.length} tags</Text>
            </Row>
            <Text variant="small" numberOfLines={3}>
              {formData.description ||
                selectedPreview?.description ||
                "Search results can auto-fill the form so you spend less time typing and more time learning."}
            </Text>
          </View>
        </View>
      </Card>

      <Segmented<Mode> value={mode} onChange={setMode} items={modeItems} />

      {mode === "discover" ? (
        <View style={{ gap: 16 }}>
          <Card variant="glass" style={{ gap: 14 }}>
            <Row gap={8}>
              <Search size={16} color={colors.primary} />
              <Text variant="h4" weight="semibold">
                Find title details automatically
              </Text>
            </Row>

            <Row gap={10} align="flex-start">
              <Input
                containerStyle={{ flex: 1 }}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search a movie, show, book, documentary, podcast, or game..."
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={() => void handleSearch()}
              />
              <Button
                variant="secondary"
                label="Fetch"
                icon={<WandSparkles size={16} color={colors.secondaryForeground} />}
                loading={isSearching}
                disabled={isSearching || !searchQuery.trim()}
                onPress={() => void handleSearch()}
              />
            </Row>

            <Text variant="caption">
              Results appear as you type. Press Fetch to search again.
              {totalResults > 0
                ? ` Found ${totalResults} result${totalResults > 1 ? "s" : ""}.`
                : ""}
            </Text>
          </Card>

          <Card variant="glass" style={{ gap: 12 }}>
            <ResultGroupHeader
              overline="Movies & TV"
              title="Visual results"
              count={groupedResults.moviesTv.length}
            />
            {groupedResults.moviesTv.length === 0 ? (
              <HintBox text="Start typing a title to see rich suggestions with posters and quick actions." />
            ) : (
              <View style={{ gap: 12 }}>
                {groupedResults.moviesTv.slice(0, 8).map((item, index) => (
                  <MediaResultCard
                    key={`movies-${item.external_source || "ext"}-${item.external_id || item.title}-${index}`}
                    item={item}
                    isAdding={isLoading}
                    onPreview={setPreviewItem}
                    onAutofill={applyResultToForm}
                    onAdd={(it) => void addResultDirectly(it)}
                  />
                ))}
              </View>
            )}
          </Card>

          <Card variant="glass" style={{ gap: 12 }}>
            <ResultGroupHeader
              overline="Books"
              title="Curated suggestions"
              count={groupedResults.books.length}
            />
            {groupedResults.books.length === 0 ? (
              <HintBox text="Search a title and books will appear here with matching covers and metadata." />
            ) : (
              <View style={{ gap: 12 }}>
                {groupedResults.books.slice(0, 8).map((item, index) => (
                  <MediaResultCard
                    key={`books-${item.external_source || "ext"}-${item.external_id || item.title}-${index}`}
                    item={item}
                    isBook
                    isAdding={isLoading}
                    onPreview={setPreviewItem}
                    onAutofill={applyResultToForm}
                    onAdd={(it) => void addResultDirectly(it)}
                  />
                ))}
              </View>
            )}
          </Card>
        </View>
      ) : (
        <Card variant="glass" style={{ gap: 16 }}>
          <Row gap={8}>
            <LibraryBig size={16} color={colors.primary} />
            <Text variant="h4" weight="semibold">
              Final details
            </Text>
          </Row>

          <Field label="Title *">
            <Input
              value={formData.title}
              onChangeText={(value) => update("title", value)}
              placeholder="Enter title..."
              autoCapitalize="none"
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

          <Select<MediaStatus>
            label="Status"
            value={formData.status}
            onChange={(value) => update("status", value)}
            options={statusOptions}
          />

          <Field label="Description">
            <Textarea
              value={formData.description}
              onChangeText={(value) => update("description", value)}
              placeholder="Auto-filled from API when available"
            />
          </Field>

          <Row gap={12} align="flex-start">
            <View style={{ flex: 1 }}>
              <Field label="Year">
                <Input
                  value={formData.year}
                  onChangeText={(value) => update("year", value)}
                  keyboardType="number-pad"
                  placeholder="2024"
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Creator / Author / Director">
                <Input
                  value={formData.creator}
                  onChangeText={(value) => update("creator", value)}
                  placeholder="Enter name..."
                />
              </Field>
            </View>
          </Row>

          <Field label="Cover Image URL">
            <Input
              value={formData.coverUrl}
              onChangeText={(value) => update("coverUrl", value)}
              placeholder="https://..."
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </Field>
          {formData.coverUrl.trim() ? (
            <View style={{ width: 88 }}>
              <MediaPoster
                coverUrl={formData.coverUrl.trim()}
                type={formData.type}
                height={132}
                style={{ width: 88 }}
              />
            </View>
          ) : null}

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
        </Card>
      )}

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
          label="Add to Library"
          style={{ flex: 1 }}
          loading={isLoading}
          disabled={isLoading}
          onPress={() => void handleSubmit()}
        />
      </Row>

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

/** Dashed placeholder shown inside empty result groups. */
function HintBox({ text }: { text: string }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        minHeight: 120,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.xl,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: colors.border,
        paddingHorizontal: 16,
      }}
    >
      <Text variant="small" align="center">
        {text}
      </Text>
    </View>
  );
}
