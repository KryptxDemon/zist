import React, { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { ChevronDown, ChevronUp, Plus, Search } from "lucide-react-native";

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

/**
 * "Share from your library" composer.
 *
 * Replaces the web `FeedComposeDialog`: pick one of your shareable items
 * (theme / vocab / quote), write a caption, choose visibility and optionally
 * discover a brand-new title to add to your library first.
 */
export interface FeedComposeSheetProps {
  /** Controlled visibility. Omit to let the sheet manage it (with `showTrigger`). */
  visible?: boolean;
  onClose?: () => void;
  /** Called after a successful post so the feed can refresh. */
  onPost: () => void;
  /** Render the built-in "Share" trigger button (default true). */
  showTrigger?: boolean;
}

type PostType = "theme" | "vocab" | "quote";
type Visibility = "friends" | "global";

export function FeedComposeSheet({
  visible: controlledVisible,
  onClose,
  onPost,
  showTrigger = true,
}: FeedComposeSheetProps) {
  const { colors } = useTheme();
  const { toast } = useToast();

  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledVisible ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (controlledVisible === undefined) setInternalOpen(next);
    if (!next) onClose?.();
  };

  const [isPosting, setIsPosting] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [postType, setPostType] = useState<PostType>("theme");
  const [visibility, setVisibility] = useState<Visibility>("global");
  const [caption, setCaption] = useState("");
  const [selectedId, setSelectedId] = useState("");
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
        setThemes(data.themes);
        setVocab(data.vocab);
        setQuotes(data.quotes);
        setSelectedId("");
      } catch {
        if (cancelled) return;
        toast({
          title: "Could not load your library content",
          description: "Add themes, vocabulary, or quotes to a media item first.",
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
    () => (postType === "theme" ? themes : postType === "vocab" ? vocab : quotes),
    [postType, themes, vocab, quotes],
  );

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
    label: `${item.label} — ${item.mediaTitle}`,
  }));

  return (
    <View>
      {showTrigger ? (
        <Button
          label="Share"
          icon={<Plus size={16} color={colors.primaryForeground} />}
          onPress={() => setOpen(true)}
        />
      ) : null}

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        presentation="sheet"
        title="Share from your library"
        description="Pick something you've saved and add your take on it."
      >
        <Segmented<PostType>
          value={postType}
          onChange={(next) => {
            setPostType(next);
            setSelectedId("");
          }}
          items={[
            { value: "theme", label: "Themes" },
            { value: "vocab", label: "Vocab" },
            { value: "quote", label: "Quotes" },
          ]}
        />

        <View style={{ gap: 6 }}>
          <Label>Pick content</Label>
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
              placeholder={`Select a ${postType}…`}
            />
          )}
        </View>

        <View style={{ gap: 6 }}>
          <Label>Visibility</Label>
          <Segmented<Visibility>
            value={visibility}
            onChange={setVisibility}
            items={[
              { value: "global", label: "Global — everyone" },
              { value: "friends", label: "Friends" },
            ]}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Label>Your thoughts</Label>
          <Textarea
            placeholder="Share your opinion on this theme, word, or quote…"
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
