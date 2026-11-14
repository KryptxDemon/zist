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
          label="Share to Feed"
          icon={<Share2 size={16} color={colors.primaryForeground} />}
          onPress={() => setOpen(true)}
        />
      ) : null}

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        presentation="sheet"
        title="Share to Community Feed"
        description="Share a movie, book review, memorable quote, or theme."
      >
        <Segmented<PostType>
          value={postType}
          onChange={(next) => {
            setPostType(next);
            setSelectedId("");
          }}
          items={[
            { value: "media", label: "Media" },
            { value: "theme", label: "Themes" },
            { value: "vocab", label: "Vocab" },
            { value: "quote", label: "Quotes" },
          ]}
        />

        <View style={{ gap: 6 }}>
          <Label>Pick from your library</Label>
          {isLoadingContent ? (
            <Spinner label="Loading your library…" />
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
                {`No ${postType} items found. Add some in your media library first.`}
              </Text>
            </View>
          ) : (
            <Select<string>
              value={selectedId || null}
              onChange={setSelectedId}
              options={selectOptions}
              placeholder={`Select ${postType === "media" ? "a movie or book" : `a ${postType}`}…`}
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
          <Label>Visibility</Label>
          <Segmented<Visibility>
            value={visibility}
            onChange={setVisibility}
            items={[
              { value: "global", label: "Public — everyone" },
              { value: "friends", label: "Friends only" },
            ]}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Label>Your thoughts / review</Label>
          <Textarea
            placeholder={
              postType === "media"
                ? "Write your review or thoughts on this title…"
                : "Share your opinion on this theme, word, or quote…"
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
              Not in your library yet? Discover media
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
          label="Post to feed"
          loading={isPosting}
          disabled={isPosting || !selectedId}
          fullWidth
          onPress={handlePost}
        />
      </Sheet>
    </View>
  );
}
