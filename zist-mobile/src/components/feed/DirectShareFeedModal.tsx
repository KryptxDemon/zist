import React, { useState } from "react";
import { View } from "react-native";
import { BookOpen, Globe, Lightbulb, Quote, Rss, Users } from "lucide-react-native";

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
  type: "theme" | "vocab" | "quote";
  id: string;
  title: string;
  subtitle?: string;
  mediaTitle?: string;
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
    item.type === "theme"
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon size={14} color={colors.primary} />
            <Text
              variant="caption"
              weight="semibold"
              uppercase
              letterSpacing={1.2}
              tint={colors.primary}
            >
              {item.type} {item.mediaTitle ? `· ${item.mediaTitle}` : ""}
            </Text>
          </View>
          <Text variant="small" weight="bold" numberOfLines={2}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text variant="caption" color="mutedForeground" numberOfLines={3}>
              {item.subtitle}
            </Text>
          ) : null}
        </Card>

        {/* Caption input */}
        <View style={{ gap: 6 }}>
          <Text variant="small" weight="medium">
            Your Take / Caption (Optional)
          </Text>
          <Textarea
            value={caption}
            onChangeText={setCaption}
            placeholder="What did you learn or feel from this? Add context for friends..."
            style={{ minHeight: 84 }}
          />
        </View>

        {/* Audience / Visibility */}
        <View style={{ gap: 6 }}>
          <Text variant="small" weight="medium">
            Audience
          </Text>
          <Segmented<"global" | "friends">
            value={visibility}
            onChange={setVisibility}
            items={[
              { value: "global", label: "Global Community" },
              { value: "friends", label: "Friends Only" },
            ]}
          />
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
          <Button
            variant="outline"
            label="Cancel"
            onPress={onClose}
            disabled={isPosting}
            style={{ flex: 1 }}
          />
          <Button
            label={isPosting ? "Sharing..." : "Post to Feed"}
            icon={<Rss size={16} color="#ffffff" />}
            onPress={handlePost}
            loading={isPosting}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </Sheet>
  );
}
