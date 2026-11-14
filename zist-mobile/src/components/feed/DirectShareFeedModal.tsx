import React, { useState } from "react";
import { Image, View } from "react-native";
import { BookOpen, Film, Globe, Lightbulb, Quote, Rss, Users } from "lucide-react-native";

import { useTheme } from "@/theme";
import {
  Button,
  Card,
  Segmented,
  Sheet,
  Text,
  Textarea,
  useToast,
} from "@/components/ui";
import { feedService } from "@/services/feedService";

export interface DirectShareItem {
  type: "theme" | "vocab" | "quote" | "media";
  id: string;
  title: string;
  subtitle?: string;
  mediaTitle?: string;
  coverUrl?: string;
}

interface DirectShareFeedModalProps {
  visible: boolean;
  onClose: () => void;
  item: DirectShareItem | null;
  onShared?: () => void;
}

export function DirectShareFeedModal({
  visible,
  onClose,
  item,
  onShared,
}: DirectShareFeedModalProps) {
  const { colors, radius } = useTheme();
  const { toast } = useToast();

  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<"global" | "friends">("global");
  const [isPosting, setIsPosting] = useState(false);

  if (!item) return null;

  const handlePost = async () => {
    setIsPosting(true);
    try {
      await feedService.createPost({
        type: item.type,
        contentId: item.id,
        caption: caption.trim() || undefined,
        imageUrl: item.coverUrl,
        visibility,
      });
      toast({
        title: "Shared to feed!",
        description: `Your ${item.type} is now published.`,
      });
      setCaption("");
      onClose();
      onShared?.();
    } catch (e) {
      toast({
        title: "Failed to share",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  const Icon =
    item.type === "media"
      ? Film
      : item.type === "theme"
        ? Lightbulb
        : item.type === "vocab"
          ? BookOpen
          : Quote;

  return (
    <Sheet visible={visible} onClose={onClose} title="Share to Feed">
      <View style={{ gap: 16 }}>
        {/* Item preview snippet */}
        <Card
          variant="glass"
          style={{
            padding: 14,
            gap: 6,
            backgroundColor: colors.accent + "33",
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radius.lg,
          }}
        >
          <View style={{ flexDirection: "row", gap: 10 }}>
            {item.coverUrl ? (
              <Image
                source={{ uri: item.coverUrl }}
                style={{ width: 44, height: 64, borderRadius: radius.sm }}
                resizeMode="cover"
              />
            ) : null}
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Icon size={14} color={colors.primary} />
                <Text
                  variant="caption"
                  weight="semibold"
                  style={{ textTransform: "uppercase", letterSpacing: 0.6 }}
                  color="primary"
                >
                  {item.type}
                  {item.mediaTitle && item.type !== "media" ? ` · ${item.mediaTitle}` : ""}
                </Text>
              </View>
              <Text variant="label" weight="semibold" numberOfLines={2}>
                {item.title}
              </Text>
              {item.subtitle ? (
                <Text variant="caption" color="mutedForeground" numberOfLines={2}>
                  {item.subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>

        {/* Audience */}
        <View style={{ gap: 6 }}>
          <Text variant="label" weight="medium">
            Audience
          </Text>
          <Segmented<"global" | "friends">
            value={visibility}
            onChange={setVisibility}
            items={[
              {
                value: "global",
                label: "Public (Global)",
                icon: <Globe size={14} color={colors.mutedForeground} />,
              },
              {
                value: "friends",
                label: "Friends Only",
                icon: <Users size={14} color={colors.mutedForeground} />,
              },
            ]}
          />
        </View>

        {/* Caption */}
        <View style={{ gap: 6 }}>
          <Text variant="label" weight="medium">
            Add Your Thoughts
          </Text>
          <Textarea
            value={caption}
            onChangeText={setCaption}
            placeholder="What makes this special to you? Add a takeaway or note…"
            rows={3}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
          <Button label="Cancel" variant="outline" onPress={onClose} disabled={isPosting} />
          <Button
            label="Share Now"
            icon={<Rss size={14} color={colors.primaryForeground} />}
            onPress={handlePost}
            loading={isPosting}
          />
        </View>
      </View>
    </Sheet>
  );
}
