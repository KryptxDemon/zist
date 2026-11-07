import React from "react";
import { Image, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { BookOpen, Film, FileVideo, Gamepad2, Headphones, Tv } from "lucide-react-native";

import { useTheme } from "@/theme";
import type { MediaType } from "@/types";
import { MediaTypeBadge, Progress, StatusBadge, Text } from "@/components/ui";

export const MEDIA_TYPE_ICONS: Record<
  MediaType,
  React.ComponentType<{ size?: number; color?: string }>
> = {
  movie: Film,
  tv: Tv,
  book: BookOpen,
  documentary: FileVideo,
  podcast: Headphones,
  game: Gamepad2,
};

/**
 * Rounded poster with a graceful fallback: a type-tinted gradient block with
 * the media type icon. Used by every media grid/list in the app.
 */
export function MediaPoster({
  coverUrl,
  type,
  title,
  height,
  style,
}: {
  coverUrl?: string | null;
  type: MediaType;
  title?: string;
  height?: number;
  style?: ViewStyle;
}) {
  const { colors, radius } = useTheme();
  const Icon = MEDIA_TYPE_ICONS[type] ?? Film;

  return (
    <View
      style={[
        {
          height,
          width: "100%",
          borderRadius: radius.xl,
          overflow: "hidden",
          backgroundColor: colors.muted,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <>
          <Icon size={28} color={colors.mutedForeground} />
          {title ? (
            <Text variant="caption" align="center" numberOfLines={2} style={{ paddingHorizontal: 8, marginTop: 6 }}>
              {title}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

export interface MediaCardProps {
  media: {
    id: string;
    title: string;
    type: MediaType;
    year?: number;
    creator?: string;
    coverUrl?: string | null;
    status?: string;
    rating?: number;
    progress?: number;
  };
  onPress?: () => void;
  /** `grid` is the 2-up library tile, `row` is the compact dashboard list item. */
  layout?: "grid" | "row";
  style?: ViewStyle;
}

/** Media tile used in the Library grid and Dashboard rails. */
export function MediaCard({ media, onPress, layout = "grid", style }: MediaCardProps) {
  const { colors, radius, shadow } = useTheme();
  const subtitle = [media.year ? String(media.year) : null, media.creator].filter(Boolean).join(" · ");

  const CardContainer = onPress ? Pressable : View;

  if (layout === "row") {
    return (
      <CardContainer
        onPress={onPress}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            padding: 10,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
          },
          style,
        ]}
      >
        <MediaPoster coverUrl={media.coverUrl} type={media.type} title={media.title} height={64} style={{ width: 48, flexGrow: 0 }} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="label" weight="semibold" numberOfLines={1}>
            {media.title}
          </Text>
          {subtitle ? (
            <Text variant="caption" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {media.status ? <StatusBadge status={media.status} /> : null}
      </CardContainer>
    );
  }

  return (
    <CardContainer onPress={onPress} style={[{ flex: 1, gap: 8 }, style]}>
      <View style={[{ borderRadius: radius.xl }, shadow("sm")]}>
        <MediaPoster coverUrl={media.coverUrl} type={media.type} title={media.title} height={190} />
      </View>
      <View style={{ gap: 4 }}>
        <Text variant="label" weight="semibold" numberOfLines={2}>
          {media.title}
        </Text>
        {subtitle ? (
          <Text variant="caption" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <MediaTypeBadge type={media.type} />
          {media.status ? <StatusBadge status={media.status} /> : null}
        </View>
        {media.progress != null ? <Progress value={media.progress} height={5} /> : null}
      </View>
    </CardContainer>
  );
}
