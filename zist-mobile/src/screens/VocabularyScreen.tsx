import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  Lightbulb,
  Link as LinkIcon,
  Pencil,
  PenLine,
  Plus,
  Trash2,
} from "lucide-react-native";

import { useTheme } from "@/theme";
import { mediaService, vocabService } from "@/services/mediaService";
import { dictionaryService } from "@/services/externalServices";
import { parseTimestamp } from "@/lib/time";
import type { MediaItem, MediaType, VocabItem } from "@/types";
import {
  Button,
  Card,
  ChipSelect,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Input,
  MediaTypeBadge,
  Progress,
  Row,
  Screen,
  SearchInput,
  Segmented,
  Select,
  Sheet,
  Skeleton,
  Text,
  Textarea,
  type SelectOption,
} from "@/components/ui";

type VocabWithMedia = VocabItem & {
  mediaTitle: string;
  mediaType: MediaType;
};

type LearnFilter = "all" | "learned" | "unlearned";
type SortKey = "recent" | "alpha" | "media";

interface VocabForm {
  mediaId: string;
  word: string;
  definition: string;
  exampleSentence: string;
  whereFound: string;
  tags: string;
  userSentence: string;
  memoryTip: string;
  isLearned: boolean;
}

const EMPTY_FORM: VocabForm = {
  mediaId: "",
  word: "",
  definition: "",
  exampleSentence: "",
  whereFound: "",
  tags: "",
  userSentence: "",
  memoryTip: "",
  isLearned: false,
};

const SORT_OPTIONS: SelectOption<SortKey>[] = [
  { value: "recent", label: "Recently added" },
  { value: "alpha", label: "A → Z" },
  { value: "media", label: "By media" },
];

/** Native port of the web `Vocabulary` page, with inline edit/delete. */
export function VocabularyScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [items, setItems] = useState<VocabWithMedia[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [learnFilter, setLearnFilter] = useState<LearnFilter>("all");
  const [mediaFilter, setMediaFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("recent");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VocabForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [deleting, setDeleting] = useState<VocabWithMedia | null>(null);

  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function loadVocabulary() {
      setIsLoading(true);
      try {
        const media = await mediaService.getAll(1, 100);
        setMediaItems(media);
        const vocabByMedia = await Promise.all(
          media.map(async (m) => {
            const vocab = await vocabService.getByMediaId(m.id);
            return vocab.map((v) => ({
              ...v,
              mediaTitle: m.title,
              mediaType: m.type,
            }));
          }),
        );

        const flattened = vocabByMedia
          .flat()
          .sort(
            (a, b) =>
              (parseTimestamp(b.createdAt)?.getTime() ?? 0) -
              (parseTimestamp(a.createdAt)?.getTime() ?? 0),
          );

        setItems(flattened);
      } catch (error) {
        console.error("Failed to load vocabulary:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadVocabulary();
  }, []);

  // Auto-fill definition + example from the dictionary API while creating a new
  // word — parity with the web page's debounced lookup.
  useEffect(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    if (!formOpen || editingId) return;
    const word = form.word.trim();

    if (word.length < 2) {
      setForm((current) => ({ ...current, definition: "", exampleSentence: "" }));
      setIsAutoLoading(false);
      return;
    }

    setIsAutoLoading(true);
    autoTimer.current = setTimeout(async () => {
      try {
        const result = await dictionaryService.getDefinitionAndExample(word);
        setForm((current) => ({
          ...current,
          definition: result.definition,
          exampleSentence: result.example,
        }));
      } finally {
        setIsAutoLoading(false);
      }
    }, 450);

    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
  }, [form.word, formOpen, editingId]);

  const learnedCount = items.filter((item) => item.isLearned).length;
  const unlearnedCount = items.length - learnedCount;
  const learnedRatio = items.length === 0 ? 0 : Math.round((learnedCount / items.length) * 100);

  const mediaFilterOptions = useMemo<SelectOption<string>[]>(
    () => mediaItems.map((m) => ({ value: m.id, label: m.title })),
    [mediaItems],
  );

  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) => {
      if (learnFilter === "learned" && !item.isLearned) return false;
      if (learnFilter === "unlearned" && item.isLearned) return false;
      if (mediaFilter !== "all" && item.mediaId !== mediaFilter) return false;

      if (!searchQuery) return true;

      const q = searchQuery.toLowerCase();
      return (
        item.word.toLowerCase().includes(q) ||
        (item.definition || "").toLowerCase().includes(q) ||
        (item.exampleSentence || "").toLowerCase().includes(q) ||
        item.mediaTitle.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "alpha") return a.word.localeCompare(b.word);
      if (sortBy === "media") {
        const byMedia = a.mediaTitle.localeCompare(b.mediaTitle);
        return byMedia !== 0 ? byMedia : a.word.localeCompare(b.word);
      }
      return (
        (parseTimestamp(b.createdAt)?.getTime() ?? 0) -
        (parseTimestamp(a.createdAt)?.getTime() ?? 0)
      );
    });
  }, [items, learnFilter, mediaFilter, searchQuery, sortBy]);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, mediaId: mediaItems[0]?.id ?? "" });
    setFormOpen(true);
  }, [mediaItems]);

  const openEdit = useCallback((item: VocabWithMedia) => {
    setEditingId(item.id);
    setForm({
      mediaId: item.mediaId,
      word: item.word,
      definition: item.definition ?? "",
      exampleSentence: item.exampleSentence ?? "",
      whereFound: item.whereFound ?? "",
      tags: item.tags.join(", "),
      userSentence: item.userSentence ?? "",
      memoryTip: item.memoryTip ?? "",
      isLearned: item.isLearned,
    });
    setFormOpen(true);
  }, []);

  const toggleLearned = async (item: VocabWithMedia) => {
    try {
      const updated = await vocabService.update(item.id, { isLearned: !item.isLearned });
      setItems((prev) =>
        prev.map((v) =>
          v.id === item.id
            ? { ...v, ...updated, mediaTitle: item.mediaTitle, mediaType: item.mediaType }
            : v,
        ),
      );
    } catch (error) {
      console.error("Failed to update word status:", error);
    }
  };

  const handleSave = async () => {
    if (!form.mediaId || !form.word.trim()) return;

    setIsSaving(true);
    try {
      const tags = form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      if (editingId) {
        const updated = await vocabService.update(editingId, {
          word: form.word.trim(),
          definition: form.definition.trim() || undefined,
          exampleSentence: form.exampleSentence.trim() || undefined,
          whereFound: form.whereFound.trim() || undefined,
          tags,
          userSentence: form.userSentence.trim() || undefined,
          memoryTip: form.memoryTip.trim() || undefined,
          isLearned: form.isLearned,
        });
        setItems((prev) =>
          prev.map((v) =>
            v.id === editingId ? { ...v, ...updated, mediaTitle: v.mediaTitle, mediaType: v.mediaType } : v,
          ),
        );
      } else {
        const media = mediaItems.find((item) => item.id === form.mediaId);
        const created = await vocabService.create({
          mediaId: form.mediaId,
          word: form.word.trim(),
          definition: form.definition.trim() || undefined,
          exampleSentence: form.exampleSentence.trim() || undefined,
          whereFound: form.whereFound.trim() || undefined,
          tags,
          userSentence: form.userSentence.trim() || undefined,
          memoryTip: form.memoryTip.trim() || undefined,
          isLearned: form.isLearned,
        });
        setItems((prev) => [
          {
            ...created,
            mediaTitle: media?.title || "Unknown media",
            mediaType: media?.type || "book",
          },
          ...prev,
        ]);
      }

      setFormOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      console.error("Failed to save vocabulary:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    try {
      await vocabService.delete(target.id);
      setItems((prev) => prev.filter((v) => v.id !== target.id));
    } catch (error) {
      console.error("Failed to delete vocabulary:", error);
    }
  };

  const header = (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text variant="h1">Vocabulary</Text>
        <Text variant="muted">Track and review all words from your media.</Text>
      </View>

      <Row gap={10}>
        <Button
          variant="outline"
          label="Go to Library"
          style={{ flex: 1 }}
          onPress={() => router.push("/library")}
        />
        <Button
          label="Add Vocabulary"
          icon={<Plus size={18} color={colors.primaryForeground} />}
          style={{ flex: 1 }}
          onPress={openCreate}
        />
      </Row>

      <Card variant="glass" style={{ gap: 12 }}>
        <Row justify="space-between">
          <Text variant="small">Progress</Text>
          <Text variant="small" weight="semibold" tint={colors.foreground}>
            {learnedCount} / {items.length} learned
          </Text>
        </Row>
        <Progress value={learnedRatio} />
        <Row justify="space-between">
          <View style={{ gap: 2 }}>
            <Text variant="caption">Total Words</Text>
            <Text variant="h4" weight="semibold">
              {items.length}
            </Text>
          </View>
          <View style={{ gap: 2 }}>
            <Text variant="caption">Learned</Text>
            <Text variant="h4" weight="semibold" tint="#34d399">
              {learnedCount}
            </Text>
          </View>
          <View style={{ gap: 2 }}>
            <Text variant="caption">Need Review</Text>
            <Text variant="h4" weight="semibold" tint="#fbbf24">
              {unlearnedCount}
            </Text>
          </View>
        </Row>
      </Card>

      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by word, meaning, tag, or media..."
      />

      <Segmented<LearnFilter>
        value={learnFilter}
        onChange={setLearnFilter}
        items={[
          { value: "all", label: "All" },
          { value: "learned", label: "Learned" },
          { value: "unlearned", label: "Unlearned" },
        ]}
      />

      <ChipSelect<string>
        value={mediaFilter}
        onChange={setMediaFilter}
        allLabel="All media"
        options={mediaFilterOptions}
      />

      <Select<SortKey> value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} placeholder="Sort" />
    </View>
  );

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={isLoading ? [] : filteredItems}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: 12, marginTop: 4 }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={104} rounded={16} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<BookOpen size={28} color={colors.mutedForeground} />}
              title="No vocabulary found"
              description="Add vocabulary in a media detail page or adjust your filters."
            />
          )
        }
        renderItem={({ item }) => (
          <VocabCard
            item={item}
            onToggleLearned={() => toggleLearned(item)}
            onEdit={() => openEdit(item)}
            onDelete={() => setDeleting(item)}
            onOpenMedia={() =>
              router.push({ pathname: "/media/[id]", params: { id: item.mediaId } })
            }
          />
        )}
      />

      <Sheet
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? "Edit Vocabulary" : "Add Vocabulary"}
        description={
          editingId ? undefined : "Definition and example auto-fill from the dictionary."
        }
        footer={
          <Row gap={10}>
            <Button
              variant="outline"
              label="Cancel"
              style={{ flex: 1 }}
              onPress={() => setFormOpen(false)}
            />
            <Button
              label={editingId ? "Save Changes" : "Add Word"}
              style={{ flex: 1 }}
              loading={isSaving}
              disabled={isSaving || !form.mediaId || !form.word.trim()}
              onPress={handleSave}
            />
          </Row>
        }
      >
        <Select<string>
          label="Media"
          value={form.mediaId || null}
          onChange={(value) => setForm((current) => ({ ...current, mediaId: value }))}
          options={mediaItems.map((m) => ({ value: m.id, label: m.title }))}
          placeholder="Choose media"
        />

        <View style={{ gap: 6 }}>
          <Input
            label="Word"
            value={form.word}
            onChangeText={(value) => setForm((current) => ({ ...current, word: value }))}
            placeholder="Enter a word"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Row gap={6}>
            {isAutoLoading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            <Text variant="caption" style={{ flex: 1 }}>
              Definition and example are pulled automatically from the dictionary API.
            </Text>
          </Row>
        </View>

        <Input
          label="Definition"
          value={form.definition}
          onChangeText={(value) => setForm((current) => ({ ...current, definition: value }))}
          placeholder="Auto-filled definition"
          multiline
        />
        <Input
          label="Example Sentence"
          value={form.exampleSentence}
          onChangeText={(value) => setForm((current) => ({ ...current, exampleSentence: value }))}
          placeholder="Auto-filled example sentence"
          multiline
        />
        <Input
          label="Where Found"
          value={form.whereFound}
          onChangeText={(value) => setForm((current) => ({ ...current, whereFound: value }))}
          placeholder="Chapter 3, opening scene..."
        />
        <Input
          label="Tags"
          value={form.tags}
          onChangeText={(value) => setForm((current) => ({ ...current, tags: value }))}
          placeholder="separated, by, commas"
          autoCapitalize="none"
        />
        <Textarea
          label="Your Sentence"
          value={form.userSentence}
          onChangeText={(value) => setForm((current) => ({ ...current, userSentence: value }))}
          placeholder="Write your own sentence using the word"
        />
        <Input
          label="Memory Tip"
          value={form.memoryTip}
          onChangeText={(value) => setForm((current) => ({ ...current, memoryTip: value }))}
          placeholder="A hook that helps you remember"
          multiline
        />
      </Sheet>

      <ConfirmDialog
        visible={deleting !== null}
        title="Delete word"
        description={
          deleting ? `Remove "${deleting.word}" from your vocabulary? This cannot be undone.` : ""
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </Screen>
  );
}

function VocabCard({
  item,
  onToggleLearned,
  onEdit,
  onDelete,
  onOpenMedia,
}: {
  item: VocabWithMedia;
  onToggleLearned: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenMedia: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Card variant="outline" padded={false} style={{ borderColor: colors.border }}>
      <View style={{ padding: 16, gap: 10 }}>
        <Row gap={8} style={{ alignItems: "center" }}>
          <Text variant="h4" style={{ flexShrink: 1 }}>
            {item.word}
          </Text>
          <MediaTypeBadge type={item.mediaType} />
        </Row>

        {item.definition ? (
          <Text variant="small" tint={colors.mutedForeground}>
            {item.definition}
          </Text>
        ) : null}

        {item.exampleSentence ? (
          <Text variant="small" style={{ fontStyle: "italic" }}>
            “{item.exampleSentence}”
          </Text>
        ) : null}

        <Row gap={6}>
          <LinkIcon size={13} color={colors.mutedForeground} />
          <Text variant="caption" style={{ flex: 1 }} numberOfLines={1}>
            From {item.mediaTitle}
            {item.whereFound ? ` • ${item.whereFound}` : ""}
          </Text>
        </Row>

        {item.tags.length > 0 ? (
          <Row gap={6} wrap>
            {item.tags.map((tag) => (
              <View
                key={`${item.id}-${tag}`}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: colors.accent,
                }}
              >
                <Text variant="caption">{tag}</Text>
              </View>
            ))}
          </Row>
        ) : null}

        {item.memoryTip ? (
          <Row gap={6} align="flex-start">
            <Lightbulb size={14} color="#fbbf24" style={{ marginTop: 2 }} />
            <Text variant="caption" style={{ flex: 1 }}>
              {item.memoryTip}
            </Text>
          </Row>
        ) : null}

        {item.userSentence ? (
          <Row gap={6} align="flex-start">
            <PenLine size={14} color={colors.mutedForeground} style={{ marginTop: 2 }} />
            <Text variant="caption" style={{ flex: 1 }}>
              My sentence: {item.userSentence}
            </Text>
          </Row>
        ) : null}

        <Row gap={8} wrap style={{ marginTop: 2 }}>
          <Button
            size="sm"
            variant={item.isLearned ? "default" : "outline"}
            label={item.isLearned ? "Learned" : "Mark Learned"}
            icon={
              item.isLearned ? (
                <CheckCircle2 size={16} color={colors.primaryForeground} />
              ) : (
                <Circle size={16} color={colors.mutedForeground} />
              )
            }
            onPress={onToggleLearned}
          />
          <Button size="sm" variant="ghost" label="Open Media" onPress={onOpenMedia} />
          <IconButton size="iconSm" onPress={onEdit} accessibilityLabel="Edit word">
            <Pencil size={16} color={colors.mutedForeground} />
          </IconButton>
          <IconButton size="iconSm" onPress={onDelete} accessibilityLabel="Delete word">
            <Trash2 size={16} color={colors.destructive} />
          </IconButton>
        </Row>
      </View>
    </Card>
  );
}
