import React from "react";
import { Pressable, View } from "react-native";

import { MediaCard } from "@/components/media/MediaCard";
import type { MediaItem } from "@/types";

/**
 * Library grid cell.
 *
 * Wraps the shared `<MediaCard layout="grid" />` so we can attach a long-press
 * handler (the card itself only exposes `onPress`). A transparent overlay
 * captures both tap and long-press events, leaving the card untouched.
 */
export function MediaGridCard({
  media,
  width,
  onPress,
  onLongPress,
}: {
  media: MediaItem;
  width: number;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <View style={{ width }}>
      <MediaCard media={media} layout="grid" style={{ flex: 0 }} />
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={media.title}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
    </View>
  );
}
