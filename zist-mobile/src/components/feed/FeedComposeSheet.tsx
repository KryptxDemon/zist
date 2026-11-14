import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { ChevronDown, ChevronUp, Film, Plus, Search, Share2, Star } from "lucide-react-native";

import { useTheme } from "@/theme";
import {
  Button,
  Label,
  Select,
  Segmented,
  Sheet,
  Spinner,
  Text,
  Textarea,
  useToast,
} from "@/components/ui";
import { feedService } from "@/services/feedService";
import type { ShareableContentItem } from "@/types";
import { MediaDiscoverySearch } from "./MediaDiscoverySearch";

export interface FeedComposeSheetProps {
  visible?: boolean;
  onClose?: () => void;
  onPost: () => void;
  showTrigger?: boolean;
}

type PostType = "media" | "theme" | "vocab" | "quote";
type Visibility = "friends" | "global";

export function FeedComposeSheet({
  visible: controlledVisible,
  onClose,
  onPost,
  showTrigger = true,
}: FeedComposeSheetProps) {
  const { colors, radius } = useTheme();
  const { toast } = useToast();

  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledVisible ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (controlledVisible === undefined) setInternalOpen(next);
    if (!next) onClose?.();
  };

  const [isPosting, setIsPosting] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [postType, setPostType] = useState<PostType>("media");
  const [visibility, setVisibility] = useState<Visibility>("global");
  const [caption, setCaption] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [mediaList, setMediaList] = useState<ShareableContentItem[]>([]);
  const [themes, setThemes] = useState<ShareableContentItem[]>([]);
  const [vocab, setVocab] = useState<ShareableContentItem[]>([]);
  const [quotes, setQuotes] = useState<ShareableContentItem[]>([]);
  const [showDiscovery, setShowDiscovery] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      setIsLoadingContent(true);
      try {
        const data = await feedService.getShareableContent();
        if (cancelled) return;
        setMediaList(data.media || []);
        setThemes(data.themes || []);
        setVocab(data.vocab || []);
        setQuotes(data.quotes || []);
        setSelectedId("");
      } catch {
        if (cancelled) return;
        toast({
          title: "Could not load library content",
          description: "Add movies, books, or notes to your library first.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setIsLoadingContent(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, toast]);

  const items = useMemo(
    () =>
      postType === "media"
        ? mediaList
        : postType === "theme"
          ? themes
          : postType === "vocab"
            ? vocab
            : quotes,
    [postType, mediaList, themes, vocab, quotes],
  );

  const selectedItem = items.find((i) => i.id === selectedId);

  const handlePost = async () => {
    if (!selectedId) {
      toast({ title: "Select content to share", variant: "destructive" });
      return;
    }

    setIsPosting(true);
    try {
      await feedService.createPost({
        type: postType,
        contentId: selectedId,
        caption: caption.trim() || undefined,
        imageUrl: selectedItem?.coverUrl,
        visibility,
      });
      toast({ title: "Shared to feed!" });
      setOpen(false);
      setCaption("");
      setSelectedId("");
      onPost();
    } catch {
      toast({ title: "Failed to share", variant: "destructive" });
    } finally {
      setIsPosting(false);
    }
  };

  const selectOptions = items.map((item) => ({
    value: item.id,
    label: postType === "media" ? item.label : `${item.label} — ${item.mediaTitle}`,
  }));

  return (
    <View>
      {showTrigger ? (
        <Button
          label="Inscribe Reflection"
          icon={<Share2 size={15} color={colors.primaryForeground} />}
          onPress={() => setOpen(true)}
        />
      ) : null}

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        presentation="sheet"
        title="Inscribe a Reflection"
        description="Share a critical reflection, passage, or motif from your personal library."
      >
        <Segmented<PostType>
          value={postType}
          onChange={(next) => {
            setPostType(next);
            setSelectedId("");
          }}
          items={[
            { value: "media", label: "Work" },
            { value: "theme", label: "Motif" },
            { value: "vocab", label: "Lexicon" },
            { value: "quote", label: "Passage" },
          ]}
        />

        <View style={{ gap: 6 }}>
          <Label>Pick from your archive</Label>
          {isLoadingContent ? (
            <Spinner label="Accessing your archive…" />
          ) : items.length === 0 ? (
            <View
              style={{
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: colors.border,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <Text variant="small" color="mutedForeground">
                {`No recorded entries found. Inscribe some into your library first.`}
              </Text>
            </View>
          ) : (
            <Select<string>
              value={selectedId || null}
              onChange={setSelectedId}
              options={selectOptions}
              placeholder={`Select ${postType === "media" ? "a work" : postType === "quote" ? "a passage" : `a ${postType}`}…`}
            />
          )}
        </View>

        {/* Selected Item Preview */}
        {selectedItem ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 10,
              borderRadius: radius.md,
              backgroundColor: colors.accent,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            {selectedItem.coverUrl ? (
              <Image
                source={{ uri: selectedItem.coverUrl }}
                style={{ width: 40, height: 60, borderRadius: 6 }}
                resizeMode="cover"
              />
            ) : null}
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="small" weight="semibold" numberOfLines={1}>
                {selectedItem.label}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {selectedItem.mediaType ? (
                  <Text variant="caption" color="mutedForeground">
                    {selectedItem.mediaType}
                  </Text>
                ) : null}
                {selectedItem.year ? (
                  <Text variant="caption" color="mutedForeground">
                    · {selectedItem.year}
                  </Text>
                ) : null}
                {selectedItem.rating !== undefined && selectedItem.rating !== null ? (
                  <Text variant="caption" tint="#f59e0b" weight="semibold">
                    ★ {selectedItem.rating.toFixed(1)}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        <View style={{ gap: 6 }}>
          <Label>Circulation</Label>
          <Segmented<Visibility>
            value={visibility}
            onChange={setVisibility}
            items={[
              { value: "global", label: "Public Forum" },
              { value: "friends", label: "Fellow Readers" },
            ]}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Label>Marginalia & Critical Notes</Label>
          <Textarea
            placeholder={
              postType === "media"
                ? "Record your critical thoughts, reflections, or commentary on this work…"
                : "Reflect upon why this passage, motif, or word arrested your attention…"
            }
            value={caption}
            onChangeText={setCaption}
          />
        </View>

        {/* Optional discovery step: add a new title to the library first. */}
        <Pressable
          onPress={() => setShowDiscovery((v) => !v)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 10,
            borderTopWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Search size={16} color={colors.mutedForeground} />
            <Text variant="small" weight="medium">
              Not in your archive? Discover works
            </Text>
          </View>
          {showDiscovery ? (
            <ChevronUp size={16} color={colors.mutedForeground} />
          ) : (
            <ChevronDown size={16} color={colors.mutedForeground} />
          )}
        </Pressable>

        {showDiscovery ? <MediaDiscoverySearch /> : null}

        <Button
          label="Publish Reflection"
          loading={isPosting}
          disabled={isPosting || !selectedId}
          fullWidth
          onPress={handlePost}
        />
      </Sheet>
    </View>
  );
}
